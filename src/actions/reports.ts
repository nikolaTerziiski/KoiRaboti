"use server";

import { revalidatePath } from "next/cache";
import { calculateExpenseTotal, type ExpenseItemInput } from "@/lib/expenses";
import { replaceDailyReportExpenseItems } from "@/lib/expense-persistence";
import { hasSupabaseCredentials } from "@/lib/env";
import { getUserRestaurantId } from "@/lib/supabase/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PayUnits } from "@/lib/types";
import { isValidPayUnits, normalizeText, parseJsonArray, parseNumber } from "@/lib/validation";

export type ReportActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  messageKey: "msgSaveSuccess" | "msgSaveError" | null;
  refreshKey: string | null;
};

type AttendanceCorrectionPayload = {
  employeeId: string;
  payUnits: PayUnits;
  payOverride: string;
};

type ExistingAttendanceRow = {
  employee_id: string;
  daily_rate: number | string | null;
  shift_turnover: number | string | null;
  percentage_rate_snapshot: number | string | null;
  notes: string | null;
};

type EmployeeRateRow = {
  id: string;
  daily_rate: number | string;
  pay_type: string | null;
  percentage_rate: number | string | null;
};

type ExpenseItemPayload = ExpenseItemInput;

function parseAttendancePayload(
  rawValue: FormDataEntryValue | null,
): AttendanceCorrectionPayload[] {
  const parsedValue = parseJsonArray(rawValue, "Attendance payload");
  if (parsedValue.length === 0) return [];

  return parsedValue.map((entry) => {
    const candidate = entry as Partial<AttendanceCorrectionPayload>;
    const payUnits = Number(candidate.payUnits);

    if (!candidate.employeeId || !isValidPayUnits(payUnits)) {
      throw new Error("Attendance row is missing required values.");
    }

    return {
      employeeId: String(candidate.employeeId),
      payUnits,
      payOverride: String(candidate.payOverride ?? ""),
    };
  });
}

function parseExpenseItemsPayload(rawValue: FormDataEntryValue | null): ExpenseItemPayload[] {
  if (!rawValue) {
    return [];
  }

  const parsedValue = JSON.parse(String(rawValue)) as unknown;
  if (!Array.isArray(parsedValue)) {
    throw new Error("Expense payload is invalid.");
  }

  return parsedValue.map((entry) => {
    const candidate = entry as Partial<ExpenseItemPayload>;
    const amount = Number(candidate.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("Expense row is missing a valid amount.");
    }

    return {
      id: candidate.id,
      categoryId:
        candidate.categoryId == null || String(candidate.categoryId).trim().length === 0
          ? null
          : String(candidate.categoryId),
      amount,
      amountOriginal:
        candidate.amountOriginal == null ? amount : Number(candidate.amountOriginal),
      currencyOriginal:
        candidate.currencyOriginal == null ? "EUR" : String(candidate.currencyOriginal),
      description: normalizeText(candidate.description),
      receiptImagePath: normalizeText(candidate.receiptImagePath),
      receiptOcrText: normalizeText(candidate.receiptOcrText),
      sourceType: candidate.sourceType === "telegram" ? "telegram" : "web",
      telegramUserId: normalizeText(candidate.telegramUserId),
      categoryName: normalizeText(candidate.categoryName),
      categoryEmoji: normalizeText(candidate.categoryEmoji),
      createdAt: normalizeText(candidate.createdAt),
    };
  });
}

function revalidateReportViews() {
  revalidatePath("/reports");
  revalidatePath("/today");
  revalidatePath("/payroll");
  revalidatePath("/profile");
}

export async function saveReportCorrectionAction(
  _previousState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  if (!hasSupabaseCredentials()) {
    return {
      status: "error",
      message: "Report corrections cannot be saved in demo mode.",
      messageKey: "msgSaveError",
      refreshKey: null,
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "error",
      message: "Live data connection is unavailable for report corrections.",
      messageKey: "msgSaveError",
      refreshKey: null,
    };
  }

  try {
    const restaurantId = await getUserRestaurantId(supabase);
    if (!restaurantId) {
      throw new Error("No restaurant found for current user.");
    }

    const reportId = String(formData.get("reportId") ?? "").trim();
    if (!reportId) {
      throw new Error("Report id is required.");
    }

    const turnover = parseNumber(formData.get("turnover"), "Turnover");
    const profit = parseNumber(formData.get("profit"), "Profit");
    const cardAmount = parseNumber(formData.get("cardAmount"), "Card amount");
    const manualExpenseValue = parseNumber(formData.get("manualExpense"), "Manual expense");
    const attendancePayload = parseAttendancePayload(formData.get("attendancePayload"));
    const parsedExpenseItems = parseExpenseItemsPayload(formData.get("expenseItemsPayload"));
    const expenseItems =
      parsedExpenseItems.length > 0
        ? parsedExpenseItems
        : manualExpenseValue > 0
          ? [
              {
                categoryId: null,
                amount: manualExpenseValue,
                amountOriginal: manualExpenseValue,
                currencyOriginal: "EUR",
                description: null,
                receiptImagePath: null,
                receiptOcrText: null,
                sourceType: "web" as const,
                telegramUserId: null,
                categoryName: null,
                categoryEmoji: null,
                createdAt: null,
              },
            ]
          : [];
    const manualExpense = calculateExpenseTotal(expenseItems);

    const { error: reportError } = await supabase
      .from("daily_reports")
      .update({
        turnover,
        profit,
        card_amount: cardAmount,
        manual_expense: manualExpense,
      })
      .eq("id", reportId)
      .eq("restaurant_id", restaurantId);

    if (reportError) {
      throw new Error(reportError.message);
    }

    await replaceDailyReportExpenseItems(supabase, reportId, expenseItems);

    if (attendancePayload.length > 0) {
      const { data: existingAttendanceRows, error: existingAttendanceError } = await supabase
        .from("attendance_entries")
        .select("employee_id, daily_rate, shift_turnover, percentage_rate_snapshot, notes")
        .eq("daily_report_id", reportId);

      if (existingAttendanceError) {
        throw new Error(existingAttendanceError.message);
      }

      const attendanceEmployeeIds = [...new Set(attendancePayload.map((entry) => entry.employeeId))];
      const { data: employeeRows, error: employeeRatesError } = await supabase
        .from("employees")
        .select("id, daily_rate, pay_type, percentage_rate")
        .eq("restaurant_id", restaurantId)
        .in("id", attendanceEmployeeIds);

      if (employeeRatesError) {
        throw new Error(employeeRatesError.message);
      }

      const existingAttendanceByEmployeeId = new Map(
        ((existingAttendanceRows ?? []) as ExistingAttendanceRow[]).map((row) => [
          row.employee_id,
          row,
        ]),
      );
      const employeeDailyRates = new Map(
        ((employeeRows ?? []) as EmployeeRateRow[]).map((row) => [row.id, Number(row.daily_rate)]),
      );
      const employeeCompensationRows = (employeeRows ?? []) as EmployeeRateRow[];

      const missingEmployeeIds = attendanceEmployeeIds.filter(
        (employeeId) =>
          !existingAttendanceByEmployeeId.has(employeeId) && !employeeDailyRates.has(employeeId),
      );

      if (missingEmployeeIds.length > 0) {
        throw new Error(
          `Missing daily rate for employee(s): ${missingEmployeeIds.join(", ")}.`,
        );
      }

      const { error: attendanceError } = await supabase
        .from("attendance_entries")
        .upsert(
          attendancePayload.map((entry) => {
            const existingRow = existingAttendanceByEmployeeId.get(entry.employeeId);
            const employeeRow = employeeCompensationRows.find(
              (row) => row.id === entry.employeeId,
            );
            const currentDailyRate = employeeDailyRates.get(entry.employeeId);
            const dailyRate =
              existingRow?.daily_rate == null ? currentDailyRate : Number(existingRow.daily_rate);
            const percentageRateSnapshot =
              existingRow?.percentage_rate_snapshot != null
                ? Number(existingRow.percentage_rate_snapshot)
                : employeeRow?.pay_type === "fixed_plus_percentage"
                  ? employeeRow.percentage_rate == null
                    ? null
                    : Number(employeeRow.percentage_rate)
                  : null;

            if (dailyRate === undefined || !Number.isFinite(dailyRate)) {
              throw new Error(`Missing daily rate for employee ${entry.employeeId}.`);
            }

            return {
              daily_report_id: reportId,
              employee_id: entry.employeeId,
              daily_rate: dailyRate,
              pay_units: entry.payUnits,
              pay_override: normalizeText(entry.payOverride),
              shift_turnover:
                existingRow?.shift_turnover == null ? null : Number(existingRow.shift_turnover),
              percentage_rate_snapshot: percentageRateSnapshot,
              notes: existingRow?.notes ?? null,
            };
          }),
          {
            onConflict: "daily_report_id,employee_id",
          },
        );

      if (attendanceError) {
        throw new Error(attendanceError.message);
      }
    }

    revalidateReportViews();

    return {
      status: "success",
      message: "Report correction saved.",
      messageKey: "msgSaveSuccess",
      refreshKey: crypto.randomUUID(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Report correction could not be saved.",
      messageKey: "msgSaveError",
      refreshKey: null,
    };
  }
}

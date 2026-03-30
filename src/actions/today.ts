"use server";

import { revalidatePath } from "next/cache";
import { calculateExpenseTotal, type ExpenseItemInput } from "@/lib/expenses";
import { replaceDailyReportExpenseItems } from "@/lib/expense-persistence";
import { hasSupabaseCredentials } from "@/lib/env";
import { getUserRestaurantId } from "@/lib/supabase/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PayUnits } from "@/lib/types";
import { isValidPayUnits, normalizeText, parseJsonArray, parseNumber } from "@/lib/validation";

export type TodayActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  messageKey: "msgSaveSuccess" | "msgSaveError" | null;
  refreshKey: string | null;
};

type AttendancePayload = {
  employeeId: string;
  isPresent: boolean;
  payUnits: PayUnits;
};

type AttendanceRowSnapshot = {
  employee_id: string;
  pay_override: number | string | null;
  notes: string | null;
};

type EmployeeRateRow = {
  id: string;
  daily_rate: number | string;
};

<<<<<<< HEAD
type ExpenseItemPayload = ExpenseItemInput;

function normalizeText(value: FormDataEntryValue | string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function parseNumber(value: FormDataEntryValue | null, fieldName: string) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return parsed;
}

function isValidPayUnits(value: number): value is PayUnits {
  return value === 1 || value === 1.5 || value === 2;
}

=======
>>>>>>> 8e0795b99140a08092cc6027cd5ad331ab5f6dd4
function parseAttendancePayload(rawValue: FormDataEntryValue | null): AttendancePayload[] {
  const parsedValue = parseJsonArray(rawValue, "Attendance payload");
  if (parsedValue.length === 0) return [];

  return parsedValue.map((entry) => {
    const candidate = entry as Partial<AttendancePayload>;
    const payUnits = Number(candidate.payUnits);
    if (!candidate.employeeId || !isValidPayUnits(payUnits)) {
      throw new Error("Attendance row is missing required values.");
    }

    return {
      employeeId: String(candidate.employeeId),
      isPresent: Boolean(candidate.isPresent),
      payUnits,
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

function revalidateOperationalViews() {
  revalidatePath("/today");
  revalidatePath("/payroll");
  revalidatePath("/reports");
  revalidatePath("/profile");
}

async function syncDailyReportNotesContext(params: {
  restaurantId: string;
  dailyReportId: string;
  notes: string | null;
}) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  try {
    if (!params.notes) {
      await supabase
        .from("telegram_ai_context_chunks")
        .delete()
        .eq("restaurant_id", params.restaurantId)
        .eq("source_type", "daily_report")
        .eq("source_id", params.dailyReportId);
      return;
    }

    await supabase
      .from("telegram_ai_context_chunks")
      .upsert(
        {
          restaurant_id: params.restaurantId,
          source_type: "daily_report",
          source_id: params.dailyReportId,
          chunk_text: params.notes,
          freshness_at: new Date().toISOString(),
        },
        { onConflict: "source_type,source_id" },
      );
  } catch (error) {
    console.error("[TodayAction] Failed to sync AI context:", error);
  }
}

export async function saveTodayReportAction(
  _previousState: TodayActionState,
  formData: FormData,
): Promise<TodayActionState> {
  if (!hasSupabaseCredentials()) {
    return {
      status: "error",
      message: "Today data cannot be saved in demo mode.",
      messageKey: "msgSaveError",
      refreshKey: null,
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "error",
      message: "Live data connection is unavailable for saving.",
      messageKey: "msgSaveError",
      refreshKey: null,
    };
  }

  try {
    const workDate = String(formData.get("workDate") ?? "").trim();
    if (!workDate) {
      throw new Error("Work date is required.");
    }

    const restaurantId = await getUserRestaurantId(supabase);
    if (!restaurantId) {
      throw new Error("No restaurant found for current user.");
    }

    const turnover = parseNumber(formData.get("turnover"), "Turnover");
    const profit = parseNumber(formData.get("profit"), "Profit");
    const cardAmount = parseNumber(formData.get("cardAmount"), "Card amount");
    const manualExpenseValue = parseNumber(formData.get("manualExpense"), "Manual expense");
    const reportNotes = normalizeText(formData.get("reportNotes"));
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

    const { data: reportRow, error: reportError } = await supabase
      .from("daily_reports")
      .upsert(
        {
          restaurant_id: restaurantId,
          work_date: workDate,
          turnover,
          profit,
          card_amount: cardAmount,
          manual_expense: manualExpense,
          notes: reportNotes,
        },
        {
          onConflict: "restaurant_id,work_date",
        },
      )
      .select("id")
      .single();

    if (reportError || !reportRow) {
      throw new Error(reportError?.message || "Daily report could not be saved.");
    }

    await replaceDailyReportExpenseItems(supabase, reportRow.id, expenseItems);
    await syncDailyReportNotesContext({
      restaurantId,
      dailyReportId: reportRow.id,
      notes: reportNotes,
    });

    const { data: existingRows, error: existingRowsError } = await supabase
      .from("attendance_entries")
      .select("employee_id, pay_override, notes")
      .eq("daily_report_id", reportRow.id);

    if (existingRowsError) {
      throw new Error(existingRowsError.message);
    }

    const existingRowsByEmployeeId = new Map(
      ((existingRows ?? []) as AttendanceRowSnapshot[]).map((row) => [row.employee_id, row]),
    );

    const selectedRows = attendancePayload.filter((entry) => entry.isPresent);
    const selectedEmployeeIds = selectedRows.map((entry) => entry.employeeId);
    const employeeDailyRates = new Map<string, number>();

    if (selectedEmployeeIds.length > 0) {
      const { data: employeeRows, error: employeeRatesError } = await supabase
        .from("employees")
        .select("id, daily_rate")
        .eq("restaurant_id", restaurantId)
        .in("id", selectedEmployeeIds);

      if (employeeRatesError) {
        throw new Error(employeeRatesError.message);
      }

      for (const row of (employeeRows ?? []) as EmployeeRateRow[]) {
        employeeDailyRates.set(row.id, Number(row.daily_rate));
      }

      const missingEmployeeIds = selectedEmployeeIds.filter(
        (employeeId) => !employeeDailyRates.has(employeeId),
      );

      if (missingEmployeeIds.length > 0) {
        throw new Error(
          `Missing daily rate for employee(s): ${missingEmployeeIds.join(", ")}.`,
        );
      }
    }

    if (selectedRows.length > 0) {
      const { error: upsertAttendanceError } = await supabase
        .from("attendance_entries")
        .upsert(
          selectedRows.map((entry) => {
            const dailyRate = employeeDailyRates.get(entry.employeeId);
            if (dailyRate === undefined) {
              throw new Error(`Missing daily rate for employee ${entry.employeeId}.`);
            }

            const existingRow = existingRowsByEmployeeId.get(entry.employeeId);

            return {
              daily_report_id: reportRow.id,
              employee_id: entry.employeeId,
              daily_rate: dailyRate,
              pay_units: entry.payUnits,
              pay_override:
                existingRow?.pay_override == null ? null : Number(existingRow.pay_override),
              notes: existingRow?.notes ?? null,
            };
          }),
          {
            onConflict: "daily_report_id,employee_id",
          },
        );

      if (upsertAttendanceError) {
        throw new Error(upsertAttendanceError.message);
      }
    }

    const existingEmployeeIds = [...existingRowsByEmployeeId.keys()];
    const idsToDelete = existingEmployeeIds.filter(
      (employeeId) => !selectedEmployeeIds.includes(employeeId),
    );

    if (selectedEmployeeIds.length === 0 && existingEmployeeIds.length > 0) {
      const { error: deleteAllError } = await supabase
        .from("attendance_entries")
        .delete()
        .eq("daily_report_id", reportRow.id);

      if (deleteAllError) {
        throw new Error(deleteAllError.message);
      }
    } else if (idsToDelete.length > 0) {
      const { error: deleteRemovedError } = await supabase
        .from("attendance_entries")
        .delete()
        .eq("daily_report_id", reportRow.id)
        .in("employee_id", idsToDelete);

      if (deleteRemovedError) {
        throw new Error(deleteRemovedError.message);
      }
    }

    revalidateOperationalViews();

    return {
      status: "success",
      message: "Today report and attendance were saved.",
      messageKey: "msgSaveSuccess",
      refreshKey: crypto.randomUUID(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Today data could not be saved.",
      messageKey: "msgSaveError",
      refreshKey: null,
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseCredentials } from "@/lib/env";
import { getUserRestaurantId } from "@/lib/supabase/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PayUnits } from "@/lib/types";

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

function parseNumber(value: FormDataEntryValue | null, fieldName: string) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return parsed;
}

function normalizeText(value: FormDataEntryValue | string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function isValidPayUnits(value: number): value is PayUnits {
  return value === 1 || value === 1.5 || value === 2;
}

function parseAttendancePayload(
  rawValue: FormDataEntryValue | null,
): AttendanceCorrectionPayload[] {
  if (!rawValue) {
    return [];
  }

  const parsedValue = JSON.parse(String(rawValue)) as unknown;
  if (!Array.isArray(parsedValue)) {
    throw new Error("Attendance payload is invalid.");
  }

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

function revalidateReportViews() {
  revalidatePath("/reports");
  revalidatePath("/today");
  revalidatePath("/payroll");
}

export async function saveReportCorrectionAction(
  _previousState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  if (!hasSupabaseCredentials()) {
    return {
      status: "error",
      message: "Supabase is not configured. Report corrections cannot be saved in demo mode.",
      messageKey: "msgSaveError",
      refreshKey: null,
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "error",
      message: "Supabase client is unavailable for report corrections.",
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
    const manualExpense = parseNumber(formData.get("manualExpense"), "Manual expense");
    const attendancePayload = parseAttendancePayload(formData.get("attendancePayload"));

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

    if (attendancePayload.length > 0) {
      const { error: attendanceError } = await supabase
        .from("attendance_entries")
        .upsert(
          attendancePayload.map((entry) => ({
            daily_report_id: reportId,
            employee_id: entry.employeeId,
            pay_units: entry.payUnits,
            pay_override: normalizeText(entry.payOverride),
          })),
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

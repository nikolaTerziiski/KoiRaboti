"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseCredentials } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PayUnits } from "@/lib/types";

export type TodayActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  refreshKey: string | null;
};

export const initialTodayActionState: TodayActionState = {
  status: "idle",
  message: null,
  refreshKey: null,
};

type AttendancePayload = {
  employeeId: string;
  shift1: boolean;
  shift2: boolean;
  payUnits: PayUnits;
  payOverride: string;
  notes: string;
};

type ResolvedAttendancePayload = {
  employeeId: string;
  shift1: boolean;
  shift2: boolean;
  payUnits: PayUnits;
  payOverride: number | null;
  notes: string | null;
};

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

function parseAttendancePayload(rawValue: FormDataEntryValue | null): AttendancePayload[] {
  if (!rawValue) {
    return [];
  }

  const parsedValue = JSON.parse(String(rawValue)) as unknown;
  if (!Array.isArray(parsedValue)) {
    throw new Error("Attendance payload is invalid.");
  }

  return parsedValue.map((entry) => {
    const candidate = entry as Partial<AttendancePayload>;
    const payUnits = Number(candidate.payUnits);
    if (!candidate.employeeId || !isValidPayUnits(payUnits)) {
      throw new Error("Attendance row is missing required values.");
    }

    return {
      employeeId: String(candidate.employeeId),
      shift1: Boolean(candidate.shift1),
      shift2: Boolean(candidate.shift2),
      payUnits,
      payOverride: String(candidate.payOverride ?? ""),
      notes: String(candidate.notes ?? ""),
    };
  });
}

function isSelectedAttendance(entry: ResolvedAttendancePayload) {
  return (
    entry.shift1 ||
    entry.shift2 ||
    entry.payOverride !== null ||
    entry.notes !== null
  );
}

function revalidateOperationalViews() {
  revalidatePath("/today");
  revalidatePath("/payroll");
  revalidatePath("/reports");
}

export async function saveTodayReportAction(
  _previousState: TodayActionState,
  formData: FormData,
): Promise<TodayActionState> {
  if (!hasSupabaseCredentials()) {
    return {
      status: "error",
      message: "Supabase is not configured. Today data cannot be saved in demo mode.",
      refreshKey: null,
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "error",
      message: "Supabase client is unavailable for saving.",
      refreshKey: null,
    };
  }

  try {
    const workDate = String(formData.get("workDate") ?? "").trim();
    if (!workDate) {
      throw new Error("Work date is required.");
    }

    const turnover = parseNumber(formData.get("turnover"), "Turnover");
    const profit = parseNumber(formData.get("profit"), "Profit");
    const cardAmount = parseNumber(formData.get("cardAmount"), "Card amount");
    const manualExpense = parseNumber(formData.get("manualExpense"), "Manual expense");
    const reportNotes = normalizeText(formData.get("reportNotes"));
    const attendancePayload = parseAttendancePayload(formData.get("attendancePayload"));

    const { data: reportRow, error: reportError } = await supabase
      .from("daily_reports")
      .upsert(
        {
          work_date: workDate,
          turnover,
          profit,
          card_amount: cardAmount,
          manual_expense: manualExpense,
          notes: reportNotes,
        },
        {
          onConflict: "work_date",
        },
      )
      .select("id")
      .single();

    if (reportError || !reportRow) {
      throw new Error(reportError?.message || "Daily report could not be saved.");
    }

    const { data: existingRows, error: existingRowsError } = await supabase
      .from("attendance_entries")
      .select("employee_id")
      .eq("daily_report_id", reportRow.id);

    if (existingRowsError) {
      throw new Error(existingRowsError.message);
    }

    const selectedRows: ResolvedAttendancePayload[] = attendancePayload
      .map((entry) => {
        const payOverride = normalizeText(entry.payOverride);
        const parsedOverride = payOverride === null ? null : Number(payOverride);
        if (parsedOverride !== null && !Number.isFinite(parsedOverride)) {
          throw new Error("Pay override must be a valid number.");
        }

        return {
          employeeId: entry.employeeId,
          shift1: entry.shift1,
          shift2: entry.shift2,
          payUnits: entry.payUnits,
          payOverride: parsedOverride,
          notes: normalizeText(entry.notes),
        };
      })
      .filter(isSelectedAttendance);

    if (selectedRows.length > 0) {
      const { error: upsertAttendanceError } = await supabase
        .from("attendance_entries")
        .upsert(
          selectedRows.map((entry) => ({
            daily_report_id: reportRow.id,
            employee_id: entry.employeeId,
            shift_1: entry.shift1,
            shift_2: entry.shift2,
            pay_units: entry.payUnits,
            pay_override: entry.payOverride,
            notes: entry.notes,
          })),
          {
            onConflict: "daily_report_id,employee_id",
          },
        );

      if (upsertAttendanceError) {
        throw new Error(upsertAttendanceError.message);
      }
    }

    const existingEmployeeIds = (existingRows ?? []).map((row) => row.employee_id);
    const selectedEmployeeIds = selectedRows.map((entry) => entry.employeeId);
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
      message: "Today report and attendance were saved to Supabase.",
      refreshKey: crypto.randomUUID(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Today data could not be saved.",
      refreshKey: null,
    };
  }
}

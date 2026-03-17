import { createDemoSnapshot } from "@/lib/mock-data";
import type {
  AttendanceEntry,
  DailyReportWithAttendance,
  Employee,
  RestaurantSnapshot,
} from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseEmployeeRow = {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  daily_rate: number | string;
  is_active: boolean;
};

type SupabaseAttendanceRow = {
  id: string;
  daily_report_id: string;
  employee_id: string;
  shift_1: boolean;
  shift_2: boolean;
  pay_units: number | string;
  pay_override: number | string | null;
  notes: string | null;
};

type SupabaseReportRow = {
  id: string;
  work_date: string;
  turnover: number | string;
  profit: number | string;
  card_amount: number | string;
  manual_expense: number | string;
  notes: string | null;
  attendance_entries?: SupabaseAttendanceRow[];
};

function mapEmployee(row: SupabaseEmployeeRow): Employee {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    phone: row.phone,
    dailyRate: Number(row.daily_rate),
    isActive: row.is_active,
  };
}

function mapAttendance(row: SupabaseAttendanceRow): AttendanceEntry {
  return {
    id: row.id,
    dailyReportId: row.daily_report_id,
    employeeId: row.employee_id,
    shift1: row.shift_1,
    shift2: row.shift_2,
    payUnits: Number(row.pay_units) as 1 | 1.5 | 2,
    payOverride: row.pay_override === null ? null : Number(row.pay_override),
    notes: row.notes,
  };
}

function mapReport(row: SupabaseReportRow): DailyReportWithAttendance {
  return {
    id: row.id,
    workDate: row.work_date,
    turnover: Number(row.turnover),
    profit: Number(row.profit),
    cardAmount: Number(row.card_amount),
    manualExpense: Number(row.manual_expense),
    notes: row.notes,
    attendanceEntries: (row.attendance_entries ?? []).map(mapAttendance),
  };
}

function buildLiveErrorSnapshot(message: string): RestaurantSnapshot {
  return {
    mode: "supabase",
    employees: [],
    reports: [],
    errorMessage: message,
  };
}

export async function getRestaurantSnapshot(): Promise<RestaurantSnapshot> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return createDemoSnapshot();
  }

  const [employeesResponse, reportsResponse] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name, role, phone, daily_rate, is_active")
      .order("full_name"),
    supabase
      .from("daily_reports")
      .select(
        "id, work_date, turnover, profit, card_amount, manual_expense, notes, attendance_entries(id, daily_report_id, employee_id, shift_1, shift_2, pay_units, pay_override, notes)",
      )
      .order("work_date", { ascending: false }),
  ]);

  if (employeesResponse.error || reportsResponse.error) {
    const messages = [employeesResponse.error?.message, reportsResponse.error?.message]
      .filter(Boolean)
      .join(" | ");

    return buildLiveErrorSnapshot(
      messages || "Supabase data could not be loaded in live mode.",
    );
  }

  return {
    mode: "supabase",
    employees: ((employeesResponse.data ?? []) as SupabaseEmployeeRow[]).map(mapEmployee),
    reports: ((reportsResponse.data ?? []) as SupabaseReportRow[]).map(mapReport),
    errorMessage: null,
  };
}

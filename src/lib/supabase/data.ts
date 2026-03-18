import type { SupabaseClient } from "@supabase/supabase-js";
import { createDemoSnapshot } from "@/lib/mock-data";
import type {
  AttendanceEntry,
  DailyReportWithAttendance,
  Employee,
  Restaurant,
  RestaurantSnapshot,
} from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseRestaurantRow = {
  id: string;
  name: string;
  default_daily_expense: number | string;
};

type SupabaseEmployeeRow = {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  daily_rate: number | string;
  is_active: boolean;
};

type SupabaseAttendanceRow = {
  id: string;
  daily_report_id: string;
  employee_id: string;
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

function mapRestaurant(row: SupabaseRestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    defaultDailyExpense: Number(row.default_daily_expense),
  };
}

function mapEmployee(row: SupabaseEmployeeRow): Employee {
  const fullName = `${row.first_name} ${row.last_name}`.trim();

  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName,
    phoneNumber: row.phone_number,
    dailyRate: Number(row.daily_rate),
    isActive: row.is_active,
  };
}

function mapAttendance(row: SupabaseAttendanceRow): AttendanceEntry {
  return {
    id: row.id,
    dailyReportId: row.daily_report_id,
    employeeId: row.employee_id,
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
    restaurant: null,
    employees: [],
    reports: [],
    errorMessage: message,
  };
}

export async function getUserRestaurantId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .single();

  return data?.restaurant_id ?? null;
}

export async function getRestaurantSnapshot(): Promise<RestaurantSnapshot> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return createDemoSnapshot();
  }

  const [restaurantResponse, employeesResponse, reportsResponse] = await Promise.all([
    supabase
      .from("restaurants")
      .select("id, name, default_daily_expense")
      .single(),
    supabase
      .from("employees")
      .select("id, restaurant_id, first_name, last_name, phone_number, daily_rate, is_active")
      .order("last_name")
      .order("first_name"),
    supabase
      .from("daily_reports")
      .select(
        "id, work_date, turnover, profit, card_amount, manual_expense, notes, attendance_entries(id, daily_report_id, employee_id, pay_units, pay_override, notes)",
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

  const restaurant = restaurantResponse.data
    ? mapRestaurant(restaurantResponse.data as SupabaseRestaurantRow)
    : null;

  return {
    mode: "supabase",
    restaurant,
    employees: ((employeesResponse.data ?? []) as SupabaseEmployeeRow[]).map(mapEmployee),
    reports: ((reportsResponse.data ?? []) as SupabaseReportRow[]).map(mapReport),
    errorMessage: null,
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmployeePaymentConfig } from "@/lib/employee-payment-schedule";
import { createDemoSnapshot } from "@/lib/mock-data";
import type {
  AttendanceEntry,
  DailyExpenseItem,
  DailyReportWithAttendance,
  Employee,
  EmployeeRole,
  ExpenseCategory,
  Profile,
  Restaurant,
  RestaurantSnapshot,
} from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseRestaurantRow = {
  id: string;
  name: string;
  default_daily_expense: number | string;
  default_payroll_cadence: string;
  default_weekly_payday: number | string | null;
  default_monthly_pay_day: number | string | null;
  default_twice_monthly_day_1: number | string | null;
  default_twice_monthly_day_2: number | string | null;
};

type SupabaseEmployeeRow = {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string;
  role: string;
  phone_number: string | null;
  daily_rate: number | string;
  is_active: boolean;
  use_restaurant_payroll_defaults?: boolean;
  payroll_cadence?: string | null;
  weekly_payday?: number | string | null;
  monthly_pay_day?: number | string | null;
  twice_monthly_day_1?: number | string | null;
  twice_monthly_day_2?: number | string | null;
  payment_schedule?: string | null;
  payment_day_1?: number | string | null;
  payment_day_2?: number | string | null;
  payment_weekday?: number | string | null;
  balance_starts_from?: string | null;
};

type SupabaseProfileRow = {
  id: string;
  restaurant_id: string;
  full_name: string;
  email: string;
};

type SupabaseAttendanceRow = {
  id: string;
  daily_report_id: string;
  employee_id: string;
  daily_rate: number | string;
  pay_units: number | string;
  pay_override: number | string | null;
  notes: string | null;
};

type SupabaseExpenseCategoryRow = {
  id: string;
  restaurant_id: string;
  name: string;
  emoji: string | null;
  is_active: boolean;
};

type SupabaseExpenseItemRow = {
  id: string;
  daily_report_id: string;
  category_id: string | null;
  amount: number | string;
  amount_original?: number | string | null;
  currency_original?: string | null;
  description: string | null;
  receipt_image_path?: string | null;
  receipt_ocr_text?: string | null;
  source_type?: string | null;
  telegram_user_id?: string | null;
  created_at?: string | null;
  restaurant_expense_categories?:
    | {
        name: string;
        emoji: string | null;
      }
    | Array<{
        name: string;
        emoji: string | null;
      }>
    | null;
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
  daily_expense_items?: SupabaseExpenseItemRow[];
};

function mapRestaurant(row: SupabaseRestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    defaultDailyExpense: Number(row.default_daily_expense),
    defaultPayrollCadence:
      row.default_payroll_cadence === "daily" ||
      row.default_payroll_cadence === "weekly" ||
      row.default_payroll_cadence === "twice_monthly"
        ? row.default_payroll_cadence
        : "monthly",
    defaultWeeklyPayday:
      row.default_weekly_payday == null
        ? null
        : Number(row.default_weekly_payday),
    defaultMonthlyPayDay:
      row.default_monthly_pay_day == null
        ? null
        : Number(row.default_monthly_pay_day),
    defaultTwiceMonthlyDay1:
      row.default_twice_monthly_day_1 == null
        ? null
        : Number(row.default_twice_monthly_day_1),
    defaultTwiceMonthlyDay2:
      row.default_twice_monthly_day_2 == null
        ? null
        : Number(row.default_twice_monthly_day_2),
  };
}

function mapEmployee(row: SupabaseEmployeeRow): Employee {
  const fullName = `${row.first_name} ${row.last_name}`.trim();
  const role: EmployeeRole = row.role === "kitchen" ? "kitchen" : "service";
  const paymentConfig = normalizeEmployeePaymentConfig({
    paymentSchedule: row.payment_schedule,
    paymentDay1: row.payment_day_1,
    paymentDay2: row.payment_day_2,
    paymentWeekday: row.payment_weekday,
    balanceStartsFrom: row.balance_starts_from,
    payrollCadence: row.payroll_cadence,
    weeklyPayday: row.weekly_payday,
    monthlyPayDay: row.monthly_pay_day,
    twiceMonthlyDay1: row.twice_monthly_day_1,
    twiceMonthlyDay2: row.twice_monthly_day_2,
  });

  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName,
    role,
    phoneNumber: row.phone_number,
    dailyRate: Number(row.daily_rate),
    isActive: row.is_active,
    useRestaurantPayrollDefaults: row.use_restaurant_payroll_defaults ?? true,
    payrollCadence:
      row.payroll_cadence === "daily" ||
      row.payroll_cadence === "weekly" ||
      row.payroll_cadence === "twice_monthly" ||
      row.payroll_cadence === "monthly"
        ? row.payroll_cadence
        : null,
    weeklyPayday: row.weekly_payday == null ? null : Number(row.weekly_payday),
    monthlyPayDay:
      row.monthly_pay_day == null ? null : Number(row.monthly_pay_day),
    twiceMonthlyDay1:
      row.twice_monthly_day_1 == null ? null : Number(row.twice_monthly_day_1),
    twiceMonthlyDay2:
      row.twice_monthly_day_2 == null ? null : Number(row.twice_monthly_day_2),
    paymentSchedule: paymentConfig.paymentSchedule,
    paymentDay1: paymentConfig.paymentDay1,
    paymentDay2: paymentConfig.paymentDay2,
    paymentWeekday: paymentConfig.paymentWeekday,
    balanceStartsFrom: paymentConfig.balanceStartsFrom,
  };
}

function mapProfile(row: SupabaseProfileRow): Profile {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    fullName: row.full_name,
    email: row.email,
  };
}

function mapExpenseCategory(row: SupabaseExpenseCategoryRow): ExpenseCategory {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    emoji: row.emoji,
    isActive: row.is_active,
  };
}

function mapExpenseItem(row: SupabaseExpenseItemRow): DailyExpenseItem {
  const categoryRaw = row.restaurant_expense_categories;
  const category = Array.isArray(categoryRaw) ? categoryRaw[0] : categoryRaw;

  return {
    id: row.id,
    dailyReportId: row.daily_report_id,
    categoryId: row.category_id,
    amount: Number(row.amount),
    amountOriginal:
      row.amount_original == null ? null : Number(row.amount_original),
    currencyOriginal: row.currency_original ?? null,
    description: row.description,
    receiptImagePath: row.receipt_image_path ?? null,
    receiptOcrText: row.receipt_ocr_text ?? null,
    sourceType: row.source_type === "telegram" ? "telegram" : "web",
    telegramUserId: row.telegram_user_id ?? null,
    categoryName: category?.name ?? null,
    categoryEmoji: category?.emoji ?? null,
    createdAt: row.created_at ?? null,
  };
}

function mapAttendance(row: SupabaseAttendanceRow): AttendanceEntry {
  return {
    id: row.id,
    dailyReportId: row.daily_report_id,
    employeeId: row.employee_id,
    dailyRate: Number(row.daily_rate),
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
    expenseItems: (row.daily_expense_items ?? []).map(mapExpenseItem),
  };
}

function buildLiveErrorSnapshot(message: string): RestaurantSnapshot {
  return {
    mode: "supabase",
    restaurant: null,
    profile: null,
    employees: [],
    reports: [],
    expenseCategories: [],
    errorMessage: message,
  };
}

function sanitizeVisibleErrorMessage(message: string) {
  return message.replace(/Supabase/gi, "live data");
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

  const [
    restaurantResponse,
    profileResponse,
    employeesResponse,
    reportsResponse,
    expenseCategoriesResponse,
  ] = await Promise.all([
    supabase
      .from("restaurants")
      .select(
        "id, name, default_daily_expense, default_payroll_cadence, default_weekly_payday, default_monthly_pay_day, default_twice_monthly_day_1, default_twice_monthly_day_2",
      )
      .single(),
    supabase.from("profiles").select("id, restaurant_id, full_name, email").single(),
    supabase
      .from("employees")
      .select("*")
      .order("last_name")
      .order("first_name"),
    supabase
      .from("daily_reports")
      .select(
        "id, work_date, turnover, profit, card_amount, manual_expense, notes, attendance_entries(id, daily_report_id, employee_id, daily_rate, pay_units, pay_override, notes), daily_expense_items(id, daily_report_id, category_id, amount, amount_original, currency_original, description, receipt_image_path, receipt_ocr_text, source_type, telegram_user_id, created_at, restaurant_expense_categories(name, emoji))",
      )
      .order("work_date", { ascending: false }),
    supabase
      .from("restaurant_expense_categories")
      .select("id, restaurant_id, name, emoji, is_active")
      .order("name"),
  ]);

  if (
    restaurantResponse.error ||
    profileResponse.error ||
    employeesResponse.error ||
    reportsResponse.error ||
    expenseCategoriesResponse.error
  ) {
    const messages = [
      restaurantResponse.error?.message,
      profileResponse.error?.message,
      employeesResponse.error?.message,
      reportsResponse.error?.message,
      expenseCategoriesResponse.error?.message,
    ]
      .filter(Boolean)
      .join(" | ");

    return buildLiveErrorSnapshot(
      sanitizeVisibleErrorMessage(messages || "Live data could not be loaded."),
    );
  }

  const restaurant = restaurantResponse.data
    ? mapRestaurant(restaurantResponse.data as SupabaseRestaurantRow)
    : null;

  return {
    mode: "supabase",
    restaurant,
    profile: profileResponse.data
      ? mapProfile(profileResponse.data as SupabaseProfileRow)
      : null,
    employees: ((employeesResponse.data ?? []) as SupabaseEmployeeRow[]).map(mapEmployee),
    reports: ((reportsResponse.data ?? []) as SupabaseReportRow[]).map(mapReport),
    expenseCategories: ((expenseCategoriesResponse.data ?? []) as SupabaseExpenseCategoryRow[]).map(
      mapExpenseCategory,
    ),
    errorMessage: null,
  };
}



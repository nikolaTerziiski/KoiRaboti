import type { SupabaseClient } from "@supabase/supabase-js";
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
  };
}

function mapEmployee(row: SupabaseEmployeeRow): Employee {
  const fullName = `${row.first_name} ${row.last_name}`.trim();
  const role: EmployeeRole = row.role === "kitchen" ? "kitchen" : "service";

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
      .select("id, name, default_daily_expense")
      .single(),
    supabase.from("profiles").select("id, restaurant_id, full_name, email").single(),
    supabase
      .from("employees")
      .select("id, restaurant_id, first_name, last_name, role, phone_number, daily_rate, is_active")
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



import { format, startOfMonth } from "date-fns";
import { syncDailyReportManualExpense } from "@/lib/expense-persistence";
import { bgnToEur } from "@/lib/format";
import { calculateMonthStats } from "@/lib/profile-stats";
import {
  buildPayrollRows,
  getPayrollPresetWindow,
  summarizePayrollRows,
} from "@/lib/payroll";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AttendanceEntry,
  DailyExpenseItem,
  DailyReportWithAttendance,
  Employee,
  PayrollPayment,
} from "@/lib/types";
import type {
  ExpenseCategory,
  TelegramAiContextChunk,
  TelegramConnectToken,
  TelegramExpenseRecord,
  TelegramFrom,
  TelegramUser,
} from "./types";

interface RestaurantRow {
  id: string;
  name: string;
}

interface TelegramUserRow {
  id: string;
  telegram_id: number;
  restaurant_id: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  language_code: string;
  is_admin: boolean;
  chat_id: number | null;
  linked_at: string | null;
  last_seen_at: string | null;
  daily_summary_enabled: boolean;
  summary_timezone: string;
  summary_hour: number;
  last_summary_sent_on: string | null;
}

interface ExpenseCategoryRow {
  id: string;
  restaurant_id: string;
  name: string;
  emoji: string | null;
  is_active: boolean;
}

interface DailyReportLookupRow {
  id: string;
  work_date: string;
}

interface AttendanceRow {
  id: string;
  daily_report_id: string;
  employee_id: string;
  daily_rate: number | string;
  pay_units: number | string;
  pay_override: number | string | null;
  notes: string | null;
}

interface EmployeeRow {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string;
  role: string;
  phone_number: string | null;
  daily_rate: number | string;
  is_active: boolean;
}

interface DailyReportRow {
  id: string;
  work_date: string;
  turnover: number | string;
  profit: number | string;
  card_amount: number | string;
  manual_expense: number | string;
  notes: string | null;
  attendance_entries?: AttendanceRow[];
  daily_expense_items?: ExpenseItemRow[];
}

interface ExpenseItemRow {
  id: string;
  daily_report_id: string;
  category_id: string | null;
  amount: number | string;
  amount_original: number | string | null;
  currency_original: string | null;
  description: string | null;
  receipt_image_path: string | null;
  receipt_ocr_text: string | null;
  source_type: string;
  telegram_user_id: string | null;
  created_at: string;
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
}

interface PayrollPaymentRow {
  id: string;
  employee_id: string;
  amount: number | string;
  payment_type: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

interface TelegramConnectTokenRow {
  id: string;
  restaurant_id: string;
  token: string;
  expires_at: string;
  claimed_at: string | null;
  claimed_by_telegram_user_id: string | null;
}

interface AiContextChunkRow {
  id: string;
  restaurant_id: string;
  source_type: string;
  source_id: string;
  chunk_text: string;
  freshness_at: string;
}

function mapTelegramUser(row: TelegramUserRow): TelegramUser {
  return {
    id: row.id,
    telegramId: row.telegram_id,
    restaurantId: row.restaurant_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    languageCode: row.language_code,
    isAdmin: row.is_admin,
    chatId: row.chat_id,
    linkedAt: row.linked_at,
    lastSeenAt: row.last_seen_at,
    dailySummaryEnabled: row.daily_summary_enabled,
    summaryTimezone: row.summary_timezone,
    summaryHour: row.summary_hour,
    lastSummarySentOn: row.last_summary_sent_on,
  };
}

function mapCategory(row: ExpenseCategoryRow): ExpenseCategory {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    emoji: row.emoji,
    isActive: row.is_active,
  };
}

function mapExpenseItem(
  row: ExpenseItemRow,
  restaurantId: string,
  expenseDate: string,
): TelegramExpenseRecord {
  return {
    id: row.id,
    dailyReportId: row.daily_report_id,
    restaurantId,
    categoryId: row.category_id,
    telegramUserId: row.telegram_user_id,
    amount: Number(row.amount),
    amountOriginal:
      row.amount_original == null ? Number(row.amount) : Number(row.amount_original),
    currencyOriginal: row.currency_original ?? "EUR",
    description: row.description,
    receiptImagePath: row.receipt_image_path,
    receiptOcrText: row.receipt_ocr_text,
    expenseDate,
    sourceType: row.source_type,
    createdAt: row.created_at,
  };
}

function mapAttendance(row: AttendanceRow): AttendanceEntry {
  return {
    id: row.id,
    dailyReportId: row.daily_report_id,
    employeeId: row.employee_id,
    dailyRate: Number(row.daily_rate),
    payUnits: Number(row.pay_units) as 1 | 1.5 | 2,
    payOverride: row.pay_override == null ? null : Number(row.pay_override),
    notes: row.notes,
  };
}

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    role: row.role === "kitchen" ? "kitchen" : "service",
    phoneNumber: row.phone_number,
    dailyRate: Number(row.daily_rate),
    isActive: row.is_active,
  };
}

function mapPayrollPayment(row: PayrollPaymentRow): PayrollPayment {
  return {
    id: row.id,
    employeeId: row.employee_id,
    amount: Number(row.amount),
    paymentType: row.payment_type === "advance" ? "advance" : "payroll",
    periodStart: row.period_start,
    periodEnd: row.period_end,
    createdAt: row.created_at,
  };
}

function mapReport(row: DailyReportRow): DailyReportWithAttendance {
  return {
    id: row.id,
    workDate: row.work_date,
    turnover: Number(row.turnover),
    profit: Number(row.profit),
    cardAmount: Number(row.card_amount),
    manualExpense: Number(row.manual_expense),
    notes: row.notes,
    attendanceEntries: (row.attendance_entries ?? []).map(mapAttendance),
    expenseItems: (row.daily_expense_items ?? []).map((item) => {
      const categoryRaw = item.restaurant_expense_categories;
      const category = Array.isArray(categoryRaw) ? categoryRaw[0] : categoryRaw;

      return {
        id: item.id,
        dailyReportId: item.daily_report_id,
        categoryId: item.category_id,
        amount: Number(item.amount),
        amountOriginal:
          item.amount_original == null ? null : Number(item.amount_original),
        currencyOriginal: item.currency_original ?? "EUR",
        description: item.description,
        receiptImagePath: item.receipt_image_path,
        receiptOcrText: item.receipt_ocr_text,
        sourceType: item.source_type === "telegram" ? "telegram" : "web",
        telegramUserId: item.telegram_user_id,
        categoryName: category?.name ?? null,
        categoryEmoji: category?.emoji ?? null,
        createdAt: item.created_at,
      } satisfies DailyExpenseItem;
    }),
  };
}

function mapConnectToken(row: TelegramConnectTokenRow): TelegramConnectToken {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    token: row.token,
    expiresAt: row.expires_at,
    claimedAt: row.claimed_at,
    claimedByTelegramUserId: row.claimed_by_telegram_user_id,
  };
}

function mapContextChunk(row: AiContextChunkRow): TelegramAiContextChunk {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    chunkText: row.chunk_text,
    freshnessAt: row.freshness_at,
  };
}

async function getRestaurantName(restaurantId: string) {
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("restaurants")
    .select("id, name")
    .eq("id", restaurantId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Restaurant not found.");
  }

  return data.name;
}

async function getOrCreateDailyReportId(restaurantId: string, expenseDate: string) {
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("daily_reports")
    .upsert(
      {
        restaurant_id: restaurantId,
        work_date: expenseDate,
      },
      { onConflict: "restaurant_id,work_date" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Daily report could not be prepared.");
  }

  return data.id;
}

async function loadDailyReportsInRange(params: {
  restaurantId: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = getSupabaseAdminClient();
  let query = db
    .from("daily_reports")
    .select("id, work_date")
    .eq("restaurant_id", params.restaurantId)
    .order("work_date", { ascending: false });

  if (params.startDate) {
    query = query.gte("work_date", params.startDate);
  }
  if (params.endDate) {
    query = query.lte("work_date", params.endDate);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DailyReportLookupRow[];
}

async function loadRestaurantOperationalData(restaurantId: string) {
  const db = getSupabaseAdminClient();
  const [employeesResponse, reportsResponse] = await Promise.all([
    db
      .from("employees")
      .select("id, restaurant_id, first_name, last_name, role, phone_number, daily_rate, is_active")
      .eq("restaurant_id", restaurantId)
      .order("last_name")
      .order("first_name"),
    db
      .from("daily_reports")
      .select(
        "id, work_date, turnover, profit, card_amount, manual_expense, notes, attendance_entries(id, daily_report_id, employee_id, daily_rate, pay_units, pay_override, notes), daily_expense_items(id, daily_report_id, category_id, amount, amount_original, currency_original, description, receipt_image_path, receipt_ocr_text, source_type, telegram_user_id, created_at, restaurant_expense_categories(name, emoji))",
      )
      .eq("restaurant_id", restaurantId)
      .order("work_date", { ascending: false }),
  ]);

  if (employeesResponse.error || reportsResponse.error) {
    throw new Error(
      employeesResponse.error?.message ||
        reportsResponse.error?.message ||
        "Operational data could not be loaded.",
    );
  }

  const employeeRows = (employeesResponse.data ?? []) as EmployeeRow[];
  const employeeIds = employeeRows.map((employee) => employee.id);
  const paymentsResponse =
    employeeIds.length === 0
      ? { data: [] as PayrollPaymentRow[], error: null }
      : await db
          .from("payroll_payments")
          .select("id, employee_id, amount, payment_type, period_start, period_end, created_at")
          .in("employee_id", employeeIds)
          .order("created_at", { ascending: false });

  if (paymentsResponse.error) {
    throw new Error(paymentsResponse.error.message);
  }

  return {
    employees: employeeRows.map(mapEmployee),
    reports: ((reportsResponse.data ?? []) as DailyReportRow[]).map(mapReport),
    payments: ((paymentsResponse.data ?? []) as PayrollPaymentRow[]).map(mapPayrollPayment),
  };
}

export async function findOrCreateTelegramUser(
  from: TelegramFrom,
  chatId: number,
): Promise<TelegramUser> {
  const db = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await db
    .from("telegram_users")
    .select("*")
    .eq("telegram_id", from.id)
    .single();

  if (existing) {
    const { data: updated, error } = await db
      .from("telegram_users")
      .update({
        first_name: from.first_name,
        last_name: from.last_name ?? null,
        username: from.username ?? null,
        language_code: from.language_code ?? "bg",
        chat_id: chatId,
        last_seen_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !updated) {
      throw new Error(error?.message ?? "Telegram user could not be updated.");
    }

    return mapTelegramUser(updated as TelegramUserRow);
  }

  const { data: created, error } = await db
    .from("telegram_users")
    .insert({
      telegram_id: from.id,
      first_name: from.first_name,
      last_name: from.last_name ?? null,
      username: from.username ?? null,
      language_code: from.language_code ?? "bg",
      chat_id: chatId,
      last_seen_at: now,
      is_admin: false,
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Telegram user could not be created.");
  }

  return mapTelegramUser(created as TelegramUserRow);
}

export async function getOrCreateTelegramConnectToken(
  restaurantId: string,
): Promise<TelegramConnectToken> {
  const db = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await db
    .from("telegram_connect_tokens")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .is("claimed_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return mapConnectToken(existing as TelegramConnectTokenRow);
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();

  const { data: created, error } = await db
    .from("telegram_connect_tokens")
    .insert({
      restaurant_id: restaurantId,
      token,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Connect token could not be created.");
  }

  return mapConnectToken(created as TelegramConnectTokenRow);
}

export async function getTelegramLinkStatus(restaurantId: string) {
  const db = getSupabaseAdminClient();
  const { count, error } = await db
    .from("telegram_users")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    linkedUsersCount: count ?? 0,
  };
}

export async function claimTelegramConnectToken(
  token: string,
  telegramUserId: string,
  chatId: number,
) {
  const db = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: tokenRow, error: tokenError } = await db
    .from("telegram_connect_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    throw new Error(tokenError?.message ?? "Connect token was not found.");
  }

  if (tokenRow.claimed_at) {
    throw new Error("This connect token has already been used.");
  }

  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    throw new Error("This connect token has expired.");
  }

  const { count } = await db
    .from("telegram_users")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", tokenRow.restaurant_id);

  const { error: updateUserError } = await db
    .from("telegram_users")
    .update({
      restaurant_id: tokenRow.restaurant_id,
      chat_id: chatId,
      linked_at: now,
      last_seen_at: now,
      is_admin: (count ?? 0) === 0,
    })
    .eq("id", telegramUserId);

  if (updateUserError) {
    throw new Error(updateUserError.message);
  }

  const { error: claimError } = await db
    .from("telegram_connect_tokens")
    .update({
      claimed_at: now,
      claimed_by_telegram_user_id: telegramUserId,
    })
    .eq("id", tokenRow.id);

  if (claimError) {
    throw new Error(claimError.message);
  }

  return {
    restaurantId: tokenRow.restaurant_id,
    restaurantName: await getRestaurantName(tokenRow.restaurant_id),
  };
}

export async function getCategoriesForRestaurant(
  restaurantId: string,
): Promise<ExpenseCategory[]> {
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("restaurant_expense_categories")
    .select("id, restaurant_id, name, emoji, is_active")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ExpenseCategoryRow[]).map(mapCategory);
}

export async function addCategory(
  restaurantId: string,
  name: string,
  emoji?: string,
): Promise<ExpenseCategory> {
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("restaurant_expense_categories")
    .insert({
      restaurant_id: restaurantId,
      name,
      emoji: emoji ?? null,
    })
    .select("id, restaurant_id, name, emoji, is_active")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Category could not be added.");
  }

  return mapCategory(data as ExpenseCategoryRow);
}

export async function setDailySummaryEnabled(
  telegramUserId: string,
  enabled: boolean,
) {
  const db = getSupabaseAdminClient();
  const { error } = await db
    .from("telegram_users")
    .update({ daily_summary_enabled: enabled })
    .eq("id", telegramUserId);

  if (error) {
    throw new Error(error.message);
  }
}

export interface SaveExpenseParams {
  restaurantId: string;
  categoryId: string | null;
  telegramUserId: string;
  amountOriginal: number;
  currencyOriginal: string;
  description: string | null;
  receiptImagePath?: string | null;
  receiptOcrText?: string | null;
  expenseDate?: string;
}

export async function saveExpense(
  params: SaveExpenseParams,
): Promise<TelegramExpenseRecord> {
  const db = getSupabaseAdminClient();
  const amount =
    params.currencyOriginal === "BGN"
      ? bgnToEur(params.amountOriginal)
      : params.amountOriginal;
  const expenseDate = params.expenseDate ?? new Date().toISOString().slice(0, 10);
  const dailyReportId = await getOrCreateDailyReportId(params.restaurantId, expenseDate);

  const { data, error } = await db
    .from("daily_expense_items")
    .insert({
      daily_report_id: dailyReportId,
      category_id: params.categoryId,
      amount,
      amount_original: params.amountOriginal,
      currency_original: params.currencyOriginal,
      description: params.description,
      receipt_image_path: params.receiptImagePath ?? null,
      receipt_ocr_text: params.receiptOcrText ?? null,
      source_type: "telegram",
      telegram_user_id: params.telegramUserId,
    })
    .select(
      "id, daily_report_id, category_id, amount, amount_original, currency_original, description, receipt_image_path, receipt_ocr_text, source_type, telegram_user_id, created_at",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Expense could not be saved.");
  }

  await syncDailyReportManualExpense(db, dailyReportId);

  if (params.description || params.receiptOcrText) {
    await db.from("telegram_ai_context_chunks").upsert(
      {
        restaurant_id: params.restaurantId,
        source_type: "expense_item",
        source_id: data.id,
        chunk_text: [params.description, params.receiptOcrText].filter(Boolean).join("\n"),
        freshness_at: new Date().toISOString(),
      },
      { onConflict: "source_type,source_id" },
    );
  }

  return mapExpenseItem(data as ExpenseItemRow, params.restaurantId, expenseDate);
}

export interface QueryExpensesParams {
  restaurantId: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  limit?: number;
}

export async function queryExpenses(
  params: QueryExpensesParams,
): Promise<{ expenses: TelegramExpenseRecord[]; totalEur: number }> {
  const db = getSupabaseAdminClient();
  const reports = await loadDailyReportsInRange(params);
  if (reports.length === 0) {
    return { expenses: [], totalEur: 0 };
  }

  const reportDateById = new Map(reports.map((report) => [report.id, report.work_date]));
  let query = db
    .from("daily_expense_items")
    .select(
      "id, daily_report_id, category_id, amount, amount_original, currency_original, description, receipt_image_path, receipt_ocr_text, source_type, telegram_user_id, created_at",
    )
    .in("daily_report_id", reports.map((report) => report.id))
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 10);

  if (params.categoryId) {
    query = query.eq("category_id", params.categoryId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const expenses = ((data ?? []) as ExpenseItemRow[]).map((row) =>
    mapExpenseItem(row, params.restaurantId, reportDateById.get(row.daily_report_id) ?? ""),
  );
  const totalEur = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return { expenses, totalEur };
}

export interface ExpenseSummaryResult {
  byCategory: { name: string; emoji: string | null; totalEur: number; count: number }[];
  grandTotalEur: number;
}

export async function getExpenseSummary(params: {
  restaurantId: string;
  startDate: string;
  endDate: string;
}): Promise<ExpenseSummaryResult> {
  const db = getSupabaseAdminClient();
  const reports = await loadDailyReportsInRange({
    restaurantId: params.restaurantId,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  if (reports.length === 0) {
    return {
      byCategory: [],
      grandTotalEur: 0,
    };
  }

  const { data, error } = await db
    .from("daily_expense_items")
    .select("amount, restaurant_expense_categories(name, emoji)")
    .in("daily_report_id", reports.map((report) => report.id));

  if (error) {
    throw new Error(error.message);
  }

  const categoryMap = new Map<
    string,
    { name: string; emoji: string | null; totalEur: number; count: number }
  >();

  for (const row of data ?? []) {
    const categoryRaw = row.restaurant_expense_categories as unknown;
    const category = Array.isArray(categoryRaw) ? categoryRaw[0] : categoryRaw;
    const name = (category as { name?: string } | null)?.name ?? "Other";
    const emoji = (category as { emoji?: string | null } | null)?.emoji ?? null;
    const existing = categoryMap.get(name);

    if (existing) {
      existing.totalEur += Number(row.amount);
      existing.count += 1;
      continue;
    }

    categoryMap.set(name, {
      name,
      emoji,
      totalEur: Number(row.amount),
      count: 1,
    });
  }

  const byCategory = Array.from(categoryMap.values()).sort(
    (left, right) => right.totalEur - left.totalEur,
  );

  return {
    byCategory,
    grandTotalEur: byCategory.reduce((sum, category) => sum + category.totalEur, 0),
  };
}

export async function getTodaySnapshot(restaurantId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const report = await getDailyReportDetails(restaurantId, today);
  const { employees } = await loadRestaurantOperationalData(restaurantId);

  return {
    date: today,
    employeeCount: employees.filter((employee) => employee.isActive).length,
    report,
  };
}

export async function getDailyReportDetails(
  restaurantId: string,
  workDate: string,
) {
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("daily_reports")
    .select(
      "id, work_date, turnover, profit, card_amount, manual_expense, notes, attendance_entries(id, daily_report_id, employee_id, daily_rate, pay_units, pay_override, notes), daily_expense_items(id, daily_report_id, category_id, amount, amount_original, currency_original, description, receipt_image_path, receipt_ocr_text, source_type, telegram_user_id, created_at, restaurant_expense_categories(name, emoji))",
    )
    .eq("restaurant_id", restaurantId)
    .eq("work_date", workDate)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapReport(data as DailyReportRow);
}

export async function getAttendanceSummary(params: {
  restaurantId: string;
  startDate: string;
  endDate: string;
}) {
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("daily_reports")
    .select(
      "id, work_date, attendance_entries(id, daily_report_id, employee_id, daily_rate, pay_units, pay_override, notes)",
    )
    .eq("restaurant_id", params.restaurantId)
    .gte("work_date", params.startDate)
    .lte("work_date", params.endDate)
    .order("work_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const reports = (data ?? []) as Array<{
    id: string;
    work_date: string;
    attendance_entries?: AttendanceRow[];
  }>;

  const uniqueEmployees = new Set<string>();
  let totalEntries = 0;
  let totalUnits = 0;
  let laborTotal = 0;

  for (const report of reports) {
    for (const entry of report.attendance_entries ?? []) {
      uniqueEmployees.add(entry.employee_id);
      totalEntries += 1;
      totalUnits += Number(entry.pay_units);
      laborTotal +=
        entry.pay_override == null
          ? Number(entry.daily_rate) * Number(entry.pay_units)
          : Number(entry.pay_override);
    }
  }

  return {
    reportCount: reports.length,
    totalEntries,
    uniqueEmployees: uniqueEmployees.size,
    totalUnits,
    laborTotal,
  };
}

export async function getPayrollStatus(params: {
  restaurantId: string;
  startDate?: string;
  endDate?: string;
}) {
  const { employees, reports, payments } = await loadRestaurantOperationalData(params.restaurantId);
  const referenceDateKey =
    params.endDate ?? params.startDate ?? new Date().toISOString().slice(0, 10);
  const defaultWindow = getPayrollPresetWindow(
    "week",
    new Date(`${referenceDateKey}T12:00:00.000Z`),
  );
  const payrollWindow = {
    startDate: params.startDate ?? params.endDate ?? defaultWindow.startDate,
    endDate: params.endDate ?? params.startDate ?? defaultWindow.endDate,
  };

  const rows = buildPayrollRows(reports, employees, payments, payrollWindow);
  const summary = summarizePayrollRows(rows);

  return {
    startDate: payrollWindow.startDate,
    endDate: payrollWindow.endDate,
    rows,
    summary,
    unpaidRows: rows.filter((row) => row.netAmountToPay > 0 && !row.isSettled),
  };
}

export async function getMonthKpis(restaurantId: string, monthKey?: string) {
  const db = getSupabaseAdminClient();
  const effectiveMonthKey =
    monthKey ?? format(startOfMonth(new Date()), "yyyy-MM-01");
  const startDate = effectiveMonthKey;
  const endDate = `${effectiveMonthKey.slice(0, 7)}-31`;

  const { data, error } = await db
    .from("daily_reports")
    .select(
      "id, work_date, turnover, profit, card_amount, manual_expense, notes, attendance_entries(id, daily_report_id, employee_id, daily_rate, pay_units, pay_override, notes), daily_expense_items(id, daily_report_id, category_id, amount, amount_original, currency_original, description, receipt_image_path, receipt_ocr_text, source_type, telegram_user_id, created_at, restaurant_expense_categories(name, emoji))",
    )
    .eq("restaurant_id", restaurantId)
    .gte("work_date", startDate)
    .lte("work_date", endDate);

  if (error) {
    throw new Error(error.message);
  }

  const reports = ((data ?? []) as DailyReportRow[]).map(mapReport);
  return {
    monthKey: effectiveMonthKey,
    stats: calculateMonthStats(reports),
  };
}

export async function listEmployeesForRestaurant(restaurantId: string) {
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("employees")
    .select("id, restaurant_id, first_name, last_name, role, phone_number, daily_rate, is_active")
    .eq("restaurant_id", restaurantId)
    .order("last_name")
    .order("first_name");

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as EmployeeRow[]).map(mapEmployee);
}

export async function getOpenActions(restaurantId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const todayReport = await getDailyReportDetails(restaurantId, today);
  const payroll = await getPayrollStatus({ restaurantId });
  const actions: string[] = [];

  if (!todayReport) {
    actions.push("Няма записан дневен отчет за днес.");
  } else {
    if (todayReport.attendanceEntries.length === 0) {
      actions.push("Присъствието за днес още не е отбелязано.");
    }
    if (todayReport.expenseItems.length === 0) {
      actions.push("Няма въведени категоризирани разходи за днес.");
    }
  }

  if (payroll.unpaidRows.length > 0) {
    actions.push(`Има ${payroll.unpaidRows.length} неплатени заплатни позиции за активния период.`);
  }

  return actions;
}

export async function searchRestaurantContext(params: {
  restaurantId: string;
  query: string;
  limit?: number;
}): Promise<TelegramAiContextChunk[]> {
  const db = getSupabaseAdminClient();
  const normalizedQuery = params.query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const { data, error } = await db
    .from("telegram_ai_context_chunks")
    .select("id, restaurant_id, source_type, source_id, chunk_text, freshness_at")
    .eq("restaurant_id", params.restaurantId)
    .ilike("chunk_text", `%${normalizedQuery}%`)
    .order("freshness_at", { ascending: false })
    .limit(params.limit ?? 5);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AiContextChunkRow[]).map(mapContextChunk);
}

function getSummaryClock(
  value: Date,
  timeZone: string,
): {
  localDate: string;
  localHour: number;
} {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(value);
    const year = parts.find((part) => part.type === "year")?.value ?? "1970";
    const month = parts.find((part) => part.type === "month")?.value ?? "01";
    const day = parts.find((part) => part.type === "day")?.value ?? "01";
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");

    return {
      localDate: `${year}-${month}-${day}`,
      localHour: hour,
    };
  } catch {
    return {
      localDate: value.toISOString().slice(0, 10),
      localHour: value.getUTCHours(),
    };
  }
}

export async function getUsersDueForDailySummary(now = new Date()) {
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("telegram_users")
    .select("*")
    .not("restaurant_id", "is", null)
    .not("chat_id", "is", null)
    .eq("daily_summary_enabled", true);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as TelegramUserRow[])
    .map(mapTelegramUser)
    .filter((user) => {
      const { localDate, localHour } = getSummaryClock(now, user.summaryTimezone);
      return user.summaryHour === localHour && user.lastSummarySentOn !== localDate;
    });
}

export async function markDailySummarySent(
  telegramUserId: string,
  workDate: string,
) {
  const db = getSupabaseAdminClient();
  const { error } = await db
    .from("telegram_users")
    .update({ last_summary_sent_on: workDate })
    .eq("id", telegramUserId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getRestaurantInfo(restaurantId: string) {
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("restaurants")
    .select("id, name")
    .eq("id", restaurantId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Restaurant not found.");
  }

  return data as RestaurantRow;
}

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { bgnToEur } from "@/lib/format";
import type {
  Business,
  TelegramUser,
  ExpenseCategory,
  OperationalExpense,
  TelegramFrom,
} from "./types";

// ---------------------------------------------------------------------------
// Row types (snake_case from Supabase)
// ---------------------------------------------------------------------------

interface BusinessRow {
  id: string;
  name: string;
  default_currency: string;
}

interface TelegramUserRow {
  id: string;
  telegram_id: number;
  business_id: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  language_code: string;
  is_admin: boolean;
}

interface ExpenseCategoryRow {
  id: string;
  business_id: string;
  name: string;
  emoji: string | null;
  is_active: boolean;
}

interface OperationalExpenseRow {
  id: string;
  business_id: string;
  category_id: string | null;
  telegram_user_id: string | null;
  amount: number;
  amount_original: number;
  currency_original: string;
  description: string | null;
  receipt_image_path: string | null;
  expense_date: string;
  source_type: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Mappers (snake_case -> camelCase)
// ---------------------------------------------------------------------------

function mapBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    name: row.name,
    defaultCurrency: row.default_currency,
  };
}

function mapTelegramUser(row: TelegramUserRow): TelegramUser {
  return {
    id: row.id,
    telegramId: row.telegram_id,
    businessId: row.business_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    languageCode: row.language_code,
    isAdmin: row.is_admin,
  };
}

function mapCategory(row: ExpenseCategoryRow): ExpenseCategory {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    emoji: row.emoji,
    isActive: row.is_active,
  };
}

function mapExpense(row: OperationalExpenseRow): OperationalExpense {
  return {
    id: row.id,
    businessId: row.business_id,
    categoryId: row.category_id,
    telegramUserId: row.telegram_user_id,
    amount: Number(row.amount),
    amountOriginal: Number(row.amount_original),
    currencyOriginal: row.currency_original,
    description: row.description,
    receiptImagePath: row.receipt_image_path,
    expenseDate: row.expense_date,
    sourceType: row.source_type,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Telegram Users
// ---------------------------------------------------------------------------

export async function findOrCreateTelegramUser(
  from: TelegramFrom,
): Promise<TelegramUser> {
  const db = getSupabaseAdminClient();

  // Try to find existing user
  const { data: existing } = await db
    .from("telegram_users")
    .select("*")
    .eq("telegram_id", from.id)
    .single();

  if (existing) {
    // Update name/username if changed
    const needsUpdate =
      existing.first_name !== from.first_name ||
      existing.last_name !== (from.last_name ?? null) ||
      existing.username !== (from.username ?? null);

    if (needsUpdate) {
      const { data: updated } = await db
        .from("telegram_users")
        .update({
          first_name: from.first_name,
          last_name: from.last_name ?? null,
          username: from.username ?? null,
        })
        .eq("telegram_id", from.id)
        .select("*")
        .single();
      if (updated) return mapTelegramUser(updated);
    }
    return mapTelegramUser(existing);
  }

  // Create new user
  const { data: created, error } = await db
    .from("telegram_users")
    .insert({
      telegram_id: from.id,
      first_name: from.first_name,
      last_name: from.last_name ?? null,
      username: from.username ?? null,
      language_code: from.language_code ?? "bg",
      is_admin: true, // first user is admin
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create telegram user: ${error?.message}`);
  }
  return mapTelegramUser(created);
}

export async function getTelegramUser(
  telegramId: number,
): Promise<TelegramUser | null> {
  const db = getSupabaseAdminClient();
  const { data } = await db
    .from("telegram_users")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();
  return data ? mapTelegramUser(data) : null;
}

// ---------------------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------------------

export async function createBusiness(
  name: string,
  telegramUserId: string,
): Promise<Business> {
  const db = getSupabaseAdminClient();

  const { data: business, error } = await db
    .from("businesses")
    .insert({ name })
    .select("*")
    .single();

  if (error || !business) {
    throw new Error(`Failed to create business: ${error?.message}`);
  }

  // Link the telegram user to this business
  await db
    .from("telegram_users")
    .update({ business_id: business.id })
    .eq("id", telegramUserId);

  // Seed default categories
  await db.rpc("seed_default_categories", { p_business_id: business.id });

  return mapBusiness(business);
}

// ---------------------------------------------------------------------------
// Expense Categories
// ---------------------------------------------------------------------------

export async function getCategoriesForBusiness(
  businessId: string,
): Promise<ExpenseCategory[]> {
  const db = getSupabaseAdminClient();
  const { data } = await db
    .from("expense_categories")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("name");
  return (data ?? []).map(mapCategory);
}

export async function addCategory(
  businessId: string,
  name: string,
  emoji?: string,
): Promise<ExpenseCategory> {
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("expense_categories")
    .insert({ business_id: businessId, name, emoji: emoji ?? null })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to add category: ${error?.message}`);
  }
  return mapCategory(data);
}

export async function deactivateCategory(
  businessId: string,
  categoryName: string,
): Promise<boolean> {
  const db = getSupabaseAdminClient();
  const { data } = await db
    .from("expense_categories")
    .update({ is_active: false })
    .eq("business_id", businessId)
    .ilike("name", categoryName)
    .select("id");
  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Operational Expenses
// ---------------------------------------------------------------------------

export interface SaveExpenseParams {
  businessId: string;
  categoryId: string | null;
  telegramUserId: string;
  amountOriginal: number;
  currencyOriginal: string;
  description: string | null;
  receiptImagePath?: string | null;
  expenseDate?: string;
}

export async function saveExpense(
  params: SaveExpenseParams,
): Promise<OperationalExpense> {
  const db = getSupabaseAdminClient();

  const amountEur =
    params.currencyOriginal === "BGN"
      ? bgnToEur(params.amountOriginal)
      : params.amountOriginal;

  const { data, error } = await db
    .from("operational_expenses")
    .insert({
      business_id: params.businessId,
      category_id: params.categoryId,
      telegram_user_id: params.telegramUserId,
      amount: amountEur,
      currency: "EUR",
      amount_original: params.amountOriginal,
      currency_original: params.currencyOriginal,
      description: params.description,
      receipt_image_path: params.receiptImagePath ?? null,
      expense_date: params.expenseDate ?? new Date().toISOString().slice(0, 10),
      source_type: "telegram",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to save expense: ${error?.message}`);
  }
  return mapExpense(data);
}

export interface QueryExpensesParams {
  businessId: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  limit?: number;
}

export async function queryExpenses(
  params: QueryExpensesParams,
): Promise<{ expenses: OperationalExpense[]; totalEur: number }> {
  const db = getSupabaseAdminClient();

  let query = db
    .from("operational_expenses")
    .select("*")
    .eq("business_id", params.businessId)
    .order("expense_date", { ascending: false })
    .limit(params.limit ?? 10);

  if (params.startDate) {
    query = query.gte("expense_date", params.startDate);
  }
  if (params.endDate) {
    query = query.lte("expense_date", params.endDate);
  }
  if (params.categoryId) {
    query = query.eq("category_id", params.categoryId);
  }

  const { data } = await query;
  const expenses = (data ?? []).map(mapExpense);
  const totalEur = expenses.reduce((sum, e) => sum + e.amount, 0);

  return { expenses, totalEur };
}

export interface ExpenseSummaryResult {
  byCategory: { name: string; emoji: string | null; totalEur: number; count: number }[];
  grandTotalEur: number;
}

export async function getExpenseSummary(params: {
  businessId: string;
  startDate: string;
  endDate: string;
}): Promise<ExpenseSummaryResult> {
  const db = getSupabaseAdminClient();

  // Fetch expenses with category join
  const { data } = await db
    .from("operational_expenses")
    .select("amount, expense_categories(name, emoji)")
    .eq("business_id", params.businessId)
    .gte("expense_date", params.startDate)
    .lte("expense_date", params.endDate);

  const categoryMap = new Map<
    string,
    { name: string; emoji: string | null; totalEur: number; count: number }
  >();

  for (const row of data ?? []) {
    const catRaw = row.expense_categories as unknown;
    const cat = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as { name: string; emoji: string | null } | null;
    const catName = cat?.name ?? "Без категория";
    const catEmoji = cat?.emoji ?? null;
    const existing = categoryMap.get(catName);
    if (existing) {
      existing.totalEur += Number(row.amount);
      existing.count += 1;
    } else {
      categoryMap.set(catName, {
        name: catName,
        emoji: catEmoji,
        totalEur: Number(row.amount),
        count: 1,
      });
    }
  }

  const byCategory = Array.from(categoryMap.values()).sort(
    (a, b) => b.totalEur - a.totalEur,
  );
  const grandTotalEur = byCategory.reduce((sum, c) => sum + c.totalEur, 0);

  return { byCategory, grandTotalEur };
}

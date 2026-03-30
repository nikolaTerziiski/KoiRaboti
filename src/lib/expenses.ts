import type {
  DailyExpenseItem,
  DailyReportWithAttendance,
  ExpenseCategory,
  ExpenseSourceType,
} from "@/lib/types";

export type ExpenseItemInput = {
  id?: string;
  categoryId: string | null;
  amount: number;
  amountOriginal?: number | null;
  currencyOriginal?: string | null;
  description?: string | null;
  receiptImagePath?: string | null;
  receiptOcrText?: string | null;
  sourceType?: ExpenseSourceType;
  telegramUserId?: string | null;
  categoryName?: string | null;
  categoryEmoji?: string | null;
  createdAt?: string | null;
};

export type ExpenseCategoryTotal = {
  categoryId: string | null;
  name: string;
  emoji: string | null;
  amount: number;
  count: number;
};

function normalizeText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export function calculateExpenseTotal(
  items: Array<Pick<DailyExpenseItem, "amount"> | Pick<ExpenseItemInput, "amount">>,
) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export function sanitizeExpenseItems(items: ExpenseItemInput[]): ExpenseItemInput[] {
  return items
    .map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      amount: Number(item.amount),
      amountOriginal:
        item.amountOriginal == null ? null : Number(item.amountOriginal),
      currencyOriginal: normalizeText(item.currencyOriginal) ?? "EUR",
      description: normalizeText(item.description),
      receiptImagePath: normalizeText(item.receiptImagePath),
      receiptOcrText: normalizeText(item.receiptOcrText),
      sourceType: item.sourceType ?? "web",
      telegramUserId: normalizeText(item.telegramUserId),
      categoryName: normalizeText(item.categoryName),
      categoryEmoji: normalizeText(item.categoryEmoji),
      createdAt: item.createdAt ?? null,
    }))
    .filter((item) => Number.isFinite(item.amount) && item.amount > 0);
}

export function createExpenseItemFromCategory(
  category: ExpenseCategory | null,
): ExpenseItemInput {
  return {
    categoryId: category?.id ?? null,
    amount: 0,
    amountOriginal: 0,
    currencyOriginal: "EUR",
    description: null,
    receiptImagePath: null,
    receiptOcrText: null,
    sourceType: "web",
    telegramUserId: null,
    categoryName: category?.name ?? null,
    categoryEmoji: category?.emoji ?? null,
    createdAt: null,
  };
}

export function buildExpenseCategoryTotals(
  reports: DailyReportWithAttendance[],
  categories: ExpenseCategory[],
): ExpenseCategoryTotal[] {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, ExpenseCategoryTotal>();

  for (const report of reports) {
    for (const item of report.expenseItems) {
      const category = item.categoryId ? categoriesById.get(item.categoryId) : null;
      const key = item.categoryId ?? item.categoryName ?? "uncategorized";
      const existing = totals.get(key);
      const name = item.categoryName ?? category?.name ?? "Other";
      const emoji = item.categoryEmoji ?? category?.emoji ?? null;

      if (existing) {
        existing.amount += item.amount;
        existing.count += 1;
        continue;
      }

      totals.set(key, {
        categoryId: item.categoryId,
        name,
        emoji,
        amount: item.amount,
        count: 1,
      });
    }
  }

  return Array.from(totals.values()).sort((left, right) => right.amount - left.amount);
}

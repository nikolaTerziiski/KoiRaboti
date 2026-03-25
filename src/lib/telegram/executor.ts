import { eurToBgn, FIXED_BGN_PER_EUR } from "@/lib/format";
import {
  saveExpense,
  queryExpenses,
  getExpenseSummary,
  getCategoriesForBusiness,
  addCategory,
} from "./data";
import type { ExpenseCategory } from "./types";
import type { GeminiFunctionCall } from "./gemini";

interface ExecutionResult {
  success: boolean;
  message: string;
}

/**
 * Execute a Gemini function call against the database.
 * Returns a human-readable Bulgarian message describing the result.
 */
export async function executeFunctionCall(params: {
  call: GeminiFunctionCall;
  businessId: string;
  telegramUserId: string;
  categories: ExpenseCategory[];
  receiptImagePath?: string;
}): Promise<ExecutionResult> {
  const { call, businessId, telegramUserId, categories } = params;

  switch (call.name) {
    case "save_expense":
      return executeSaveExpense(call.args, businessId, telegramUserId, categories, params.receiptImagePath);
    case "query_expenses":
      return executeQueryExpenses(call.args, businessId, categories);
    case "get_expense_summary":
      return executeGetExpenseSummary(call.args, businessId);
    case "list_categories":
      return executeListCategories(categories);
    case "add_category":
      return executeAddCategory(call.args, businessId);
    default:
      return { success: false, message: `Непозната команда: ${call.name}` };
  }
}

// ---------------------------------------------------------------------------
// Individual executors
// ---------------------------------------------------------------------------

async function executeSaveExpense(
  args: Record<string, unknown>,
  businessId: string,
  telegramUserId: string,
  categories: ExpenseCategory[],
  receiptImagePath?: string,
): Promise<ExecutionResult> {
  const amount = Number(args.amount);
  if (!amount || amount <= 0) {
    return { success: false, message: "Невалидна сума. Моля, опитай пак." };
  }

  const currency = (args.currency as string) ?? "BGN";
  const categoryName = args.category_name as string;
  const description = (args.description as string) ?? null;
  const expenseDate = (args.expense_date as string) ?? undefined;

  // Resolve category by name (case-insensitive)
  const category = categories.find(
    (c) => c.name.toLowerCase() === categoryName?.toLowerCase(),
  );

  const expense = await saveExpense({
    businessId,
    categoryId: category?.id ?? null,
    telegramUserId,
    amountOriginal: amount,
    currencyOriginal: currency,
    description,
    expenseDate,
    receiptImagePath,
  });

  const displayCat = category
    ? `${category.emoji ?? ""} ${category.name}`
    : categoryName ?? "Без категория";
  const bgnAmount =
    currency === "EUR" ? eurToBgn(amount).toFixed(2) : amount.toFixed(2);
  const eurAmount = expense.amount.toFixed(2);

  return {
    success: true,
    message:
      `Записано: ${displayCat} — ${bgnAmount} лв (${eurAmount} EUR)` +
      (description ? `\n${description}` : "") +
      (expenseDate ? `\nДата: ${expenseDate}` : ""),
  };
}

async function executeQueryExpenses(
  args: Record<string, unknown>,
  businessId: string,
  categories: ExpenseCategory[],
): Promise<ExecutionResult> {
  const categoryName = args.category_name as string | undefined;
  let categoryId: string | undefined;

  if (categoryName) {
    const cat = categories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
    );
    categoryId = cat?.id;
  }

  const { expenses, totalEur } = await queryExpenses({
    businessId,
    startDate: args.start_date as string | undefined,
    endDate: args.end_date as string | undefined,
    categoryId,
    limit: args.limit ? Number(args.limit) : 10,
  });

  if (expenses.length === 0) {
    return { success: true, message: "Няма намерени разходи за този период." };
  }

  const lines = expenses.map((e) => {
    const cat = categories.find((c) => c.id === e.categoryId);
    const catLabel = cat ? `${cat.emoji ?? ""} ${cat.name}` : "—";
    const bgnAmount = eurToBgn(e.amount).toFixed(2);
    return `${e.expenseDate} | ${catLabel} | ${bgnAmount} лв${e.description ? ` | ${e.description}` : ""}`;
  });

  const totalBgn = eurToBgn(totalEur).toFixed(2);
  lines.push(`\nОбщо: ${totalBgn} лв (${totalEur.toFixed(2)} EUR)`);

  return { success: true, message: lines.join("\n") };
}

async function executeGetExpenseSummary(
  args: Record<string, unknown>,
  businessId: string,
): Promise<ExecutionResult> {
  const now = new Date();
  const startDate =
    (args.start_date as string) ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const endDate =
    (args.end_date as string) ?? now.toISOString().slice(0, 10);

  const { byCategory, grandTotalEur } = await getExpenseSummary({
    businessId,
    startDate,
    endDate,
  });

  if (byCategory.length === 0) {
    return {
      success: true,
      message: `Няма разходи за периода ${startDate} — ${endDate}.`,
    };
  }

  const lines = [`Справка: ${startDate} — ${endDate}\n`];
  for (const cat of byCategory) {
    const bgnTotal = eurToBgn(cat.totalEur).toFixed(2);
    lines.push(
      `${cat.emoji ?? "📌"} ${cat.name}: ${bgnTotal} лв (${cat.count} записа)`,
    );
  }

  const grandTotalBgn = eurToBgn(grandTotalEur).toFixed(2);
  lines.push(`\nОбщо: ${grandTotalBgn} лв (${grandTotalEur.toFixed(2)} EUR)`);
  lines.push(`Курс: 1 EUR = ${FIXED_BGN_PER_EUR} BGN`);

  return { success: true, message: lines.join("\n") };
}

async function executeListCategories(
  categories: ExpenseCategory[],
): Promise<ExecutionResult> {
  if (categories.length === 0) {
    return { success: true, message: "Няма настроени категории." };
  }

  const lines = categories.map(
    (c) => `${c.emoji ?? "📌"} ${c.name}`,
  );
  return { success: true, message: "Категории:\n" + lines.join("\n") };
}

async function executeAddCategory(
  args: Record<string, unknown>,
  businessId: string,
): Promise<ExecutionResult> {
  const name = args.name as string;
  if (!name) {
    return { success: false, message: "Моля, посочи име на категория." };
  }

  try {
    const category = await addCategory(
      businessId,
      name,
      args.emoji as string | undefined,
    );
    return {
      success: true,
      message: `Добавена категория: ${category.emoji ?? "📌"} ${category.name}`,
    };
  } catch {
    return {
      success: false,
      message: `Категория "${name}" вече съществува или възникна грешка.`,
    };
  }
}

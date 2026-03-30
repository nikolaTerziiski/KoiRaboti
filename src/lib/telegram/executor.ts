import { env } from "@/lib/env";
import { eurToBgn, FIXED_BGN_PER_EUR, formatCurrencyPair } from "@/lib/format";
import {
  addCategory,
  getAttendanceSummary,
  getDailyReportDetails,
  getExpenseSummary,
  getMonthKpis,
  getOpenActions,
  getPayrollStatus,
  getTodaySnapshot,
  listEmployeesForRestaurant,
  queryExpenses,
  saveExpense,
  searchRestaurantContext,
  setDailySummaryEnabled,
} from "./data";
import type { ExpenseCategory } from "./types";
import type { GeminiFunctionCall } from "./gemini";

interface ExecutionResult {
  success: boolean;
  message: string;
}

function buildAppLink(path: string, label = "Отвори в приложението") {
  if (!env.appUrl) {
    return "";
  }

  const normalizedBase = env.appUrl.replace(/\/$/, "");
  return `\n<a href="${normalizedBase}${path}">${label}</a>`;
}

function resolveCategory(
  categories: ExpenseCategory[],
  categoryName: string | undefined,
) {
  if (!categoryName) {
    return null;
  }

  return (
    categories.find((category) => category.name.toLowerCase() === categoryName.toLowerCase()) ??
    null
  );
}

function formatCategoryLabel(category: ExpenseCategory | null, fallback = "Без категория") {
  if (!category) {
    return fallback;
  }

  return `${category.emoji ? `${category.emoji} ` : ""}${category.name}`;
}

function formatPeriod(startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return `${startDate} - ${endDate}`;
  }
  if (startDate) {
    return `от ${startDate}`;
  }
  if (endDate) {
    return `до ${endDate}`;
  }
  return "за избрания период";
}

function formatReportSummary(report: NonNullable<Awaited<ReturnType<typeof getDailyReportDetails>>>) {
  return [
    `Оборот: ${formatCurrencyPair(report.turnover)}`,
    `Печалба: ${formatCurrencyPair(report.profit)}`,
    `Карта: ${formatCurrencyPair(report.cardAmount)}`,
    `Разходи: ${formatCurrencyPair(report.manualExpense)}`,
    `Присъствие: ${report.attendanceEntries.length} записа`,
    report.notes ? `Бележки: ${report.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatPayrollPeriodLabel(period: string) {
  return period === "first_half" ? "1-15 число" : "16-края на месеца";
}

export async function executeFunctionCall(params: {
  call: GeminiFunctionCall;
  restaurantId: string;
  telegramUserId: string;
  categories: ExpenseCategory[];
  receiptImagePath?: string;
}): Promise<ExecutionResult> {
  const { call, restaurantId, telegramUserId, categories } = params;

  switch (call.name) {
    case "save_expense":
      return executeSaveExpense(
        call.args,
        restaurantId,
        telegramUserId,
        categories,
        params.receiptImagePath,
      );
    case "query_expenses":
      return executeQueryExpenses(call.args, restaurantId, categories);
    case "get_expense_summary":
      return executeGetExpenseSummary(call.args, restaurantId);
    case "list_categories":
      return executeListCategories(categories);
    case "add_category":
      return executeAddCategory(call.args, restaurantId);
    case "get_today_snapshot":
      return executeGetTodaySnapshot(restaurantId);
    case "get_daily_report":
      return executeGetDailyReport(call.args, restaurantId);
    case "get_attendance_summary":
      return executeGetAttendanceSummary(call.args, restaurantId);
    case "get_payroll_status":
      return executeGetPayrollStatus(call.args, restaurantId);
    case "get_month_kpis":
      return executeGetMonthKpis(call.args, restaurantId);
    case "list_employees":
      return executeListEmployees(call.args, restaurantId);
    case "get_open_actions":
      return executeGetOpenActions(restaurantId);
    case "search_context":
      return executeSearchContext(call.args, restaurantId);
    case "set_daily_summary_enabled":
      return executeSetDailySummaryEnabled(call.args, telegramUserId);
    default:
      return { success: false, message: `Непозната команда: ${call.name}` };
  }
}

// ---------------------------------------------------------------------------
// Individual executors
// ---------------------------------------------------------------------------

const VALID_CURRENCIES = new Set(["BGN", "EUR"]);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
async function executeSaveExpense(
  args: Record<string, unknown>,
  restaurantId: string,
  telegramUserId: string,
  categories: ExpenseCategory[],
  receiptImagePath?: string,
): Promise<ExecutionResult> {
  const amount = Number(args.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, message: "Невалидна сума. Моля, опитай пак." };
  }

  const rawCurrency = ((args.currency as string | undefined) ?? "BGN").toUpperCase();
  const currency = VALID_CURRENCIES.has(rawCurrency) ? rawCurrency : "BGN";
  const categoryName = args.category_name as string | undefined;
  const description = (args.description as string | undefined)?.trim() || null;
  const rawExpenseDate = (args.expense_date as string | undefined)?.trim() || undefined;
  const expenseDate = rawExpenseDate && ISO_DATE_RE.test(rawExpenseDate) ? rawExpenseDate : undefined;
  const category = resolveCategory(categories, categoryName);

  const expense = await saveExpense({
    restaurantId,
    categoryId: category?.id ?? null,
    telegramUserId,
    amountOriginal: amount,
    currencyOriginal: currency,
    description,
    expenseDate,
    receiptImagePath,
  });

  return {
    success: true,
    message: [
      `Записах разход: ${formatCategoryLabel(category)}`,
      `Сума: ${
        currency === "EUR"
          ? `${amount.toFixed(2)} EUR (${eurToBgn(amount).toFixed(2)} лв)`
          : `${amount.toFixed(2)} лв (${expense.amount.toFixed(2)} EUR)`
      }`,
      expenseDate ? `Дата: ${expenseDate}` : null,
      description ? `Описание: ${description}` : null,
      receiptImagePath ? "Бележката е прикачена." : null,
      buildAppLink("/today", "Виж днешния отчет"),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function executeQueryExpenses(
  args: Record<string, unknown>,
  restaurantId: string,
  categories: ExpenseCategory[],
): Promise<ExecutionResult> {
  const category = resolveCategory(categories, args.category_name as string | undefined);
  const startDate = args.start_date as string | undefined;
  const endDate = args.end_date as string | undefined;
  const limit = args.limit ? Number(args.limit) : 10;

  const { expenses, totalEur } = await queryExpenses({
    restaurantId,
    startDate,
    endDate,
    categoryId: category?.id,
    limit,
  });

  if (expenses.length === 0) {
    return {
      success: true,
      message: `Няма намерени разходи ${formatPeriod(startDate, endDate)}.`,
    };
  }

  const lines = expenses.map((expense) => {
    const expenseCategory =
      categories.find((item) => item.id === expense.categoryId) ?? category ?? null;
    const originalAmount =
      expense.currencyOriginal === "BGN"
        ? `${expense.amountOriginal.toFixed(2)} лв`
        : `${expense.amountOriginal.toFixed(2)} EUR`;

    return [
      `${expense.expenseDate} | ${formatCategoryLabel(expenseCategory)}`,
      `${originalAmount} (${expense.amount.toFixed(2)} EUR)`,
      expense.description,
    ]
      .filter(Boolean)
      .join(" | ");
  });

  lines.push("");
  lines.push(`Общо: ${eurToBgn(totalEur).toFixed(2)} лв (${totalEur.toFixed(2)} EUR)`);
  lines.push(buildAppLink("/reports", "Отвори отчетите"));

  return { success: true, message: lines.filter(Boolean).join("\n") };
}

async function executeGetExpenseSummary(
  args: Record<string, unknown>,
  restaurantId: string,
): Promise<ExecutionResult> {
  const now = new Date();
  const startDate =
    (args.start_date as string | undefined) ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const endDate =
    (args.end_date as string | undefined) ?? now.toISOString().slice(0, 10);

  const { byCategory, grandTotalEur } = await getExpenseSummary({
    restaurantId,
    startDate,
    endDate,
  });

  if (byCategory.length === 0) {
    return {
      success: true,
      message: `Няма разходи за периода ${startDate} - ${endDate}.`,
    };
  }

  const lines = [`Разходи по категории за ${startDate} - ${endDate}:`, ""];
  for (const category of byCategory) {
    lines.push(
      `${category.emoji ? `${category.emoji} ` : ""}${category.name}: ${eurToBgn(
        category.totalEur,
      ).toFixed(2)} лв (${category.totalEur.toFixed(2)} EUR), ${category.count} бр.`,
    );
  }
  lines.push("");
  lines.push(`Общо: ${eurToBgn(grandTotalEur).toFixed(2)} лв (${grandTotalEur.toFixed(2)} EUR)`);
  lines.push(`Курс: 1 EUR = ${FIXED_BGN_PER_EUR} BGN`);
  lines.push(buildAppLink("/reports", "Виж разбивката в приложението"));

  return { success: true, message: lines.filter(Boolean).join("\n") };
}

async function executeListCategories(
  categories: ExpenseCategory[],
): Promise<ExecutionResult> {
  if (categories.length === 0) {
    return { success: true, message: "Няма активни категории разходи." };
  }

  return {
    success: true,
    message: `Категории:\n${categories
      .map((category) => `• ${formatCategoryLabel(category)}`)
      .join("\n")}`,
  };
}

async function executeAddCategory(
  args: Record<string, unknown>,
  restaurantId: string,
): Promise<ExecutionResult> {
  const name = (args.name as string | undefined)?.trim();
  const emoji = (args.emoji as string | undefined)?.trim();

  if (!name) {
    return { success: false, message: "Моля, посочи име на категория." };
  }

  try {
    const category = await addCategory(restaurantId, name, emoji);
    return {
      success: true,
      message: `Добавих категория ${formatCategoryLabel(category)}.${buildAppLink(
        "/today",
        "Отвори днешния отчет",
      )}`,
    };
  } catch {
    return {
      success: false,
      message: `Категорията "${name}" вече съществува или не можа да бъде добавена.`,
    };
  }
}

async function executeGetTodaySnapshot(restaurantId: string): Promise<ExecutionResult> {
  const snapshot = await getTodaySnapshot(restaurantId);

  if (!snapshot.report) {
    return {
      success: true,
      message: [
        `За ${snapshot.date} още няма записан дневен отчет.`,
        `Активни служители: ${snapshot.employeeCount}`,
        buildAppLink("/today", "Попълни днешния отчет"),
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  return {
    success: true,
    message: [
      `Днешен отчет (${snapshot.date})`,
      formatReportSummary(snapshot.report),
      buildAppLink("/today", "Отвори Today"),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function executeGetDailyReport(
  args: Record<string, unknown>,
  restaurantId: string,
): Promise<ExecutionResult> {
  const workDate =
    (args.work_date as string | undefined)?.trim() ?? new Date().toISOString().slice(0, 10);
  const report = await getDailyReportDetails(restaurantId, workDate);

  if (!report) {
    return {
      success: true,
      message: `Няма дневен отчет за ${workDate}.${buildAppLink("/reports", "Отвори отчетите")}`,
    };
  }

  return {
    success: true,
    message: [
      `Отчет за ${workDate}`,
      formatReportSummary(report),
      buildAppLink("/reports", "Виж в приложението"),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function executeGetAttendanceSummary(
  args: Record<string, unknown>,
  restaurantId: string,
): Promise<ExecutionResult> {
  const endDate =
    (args.end_date as string | undefined)?.trim() ?? new Date().toISOString().slice(0, 10);
  const startDate =
    (args.start_date as string | undefined)?.trim() ?? `${endDate.slice(0, 7)}-01`;

  const summary = await getAttendanceSummary({
    restaurantId,
    startDate,
    endDate,
  });

  return {
    success: true,
    message: [
      `Присъствие за ${startDate} - ${endDate}`,
      `Отчети: ${summary.reportCount}`,
      `Записи: ${summary.totalEntries}`,
      `Уникални служители: ${summary.uniqueEmployees}`,
      `Смени: ${summary.totalUnits}`,
      `Разход труд: ${formatCurrencyPair(summary.laborTotal)}`,
      buildAppLink("/reports", "Отвори отчетите"),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function executeGetPayrollStatus(
  args: Record<string, unknown>,
  restaurantId: string,
): Promise<ExecutionResult> {
  const payroll = await getPayrollStatus({
    restaurantId,
    payrollMonth: (args.payroll_month as string | undefined)?.trim(),
    payrollPeriod: args.payroll_period as "first_half" | "second_half" | undefined,
  });

  const topRows = payroll.unpaidRows.slice(0, 5);
  const totalPaid = payroll.rows.reduce(
    (sum, row) => sum + row.advancesTotal + (row.isPaid ? row.netAmountToPay : 0),
    0,
  );
  const totalRemaining = payroll.rows.reduce(
    (sum, row) => sum + (row.isPaid ? 0 : row.netAmountToPay),
    0,
  );

  return {
    success: true,
    message: [
      `Payroll статус за ${payroll.payrollMonth.slice(0, 7)} (${formatPayrollPeriodLabel(
        payroll.payrollPeriod,
      )})`,
      `Начислено: ${formatCurrencyPair(payroll.summary.totalPayroll)}`,
      `Платено: ${formatCurrencyPair(totalPaid)}`,
      `Остава: ${formatCurrencyPair(totalRemaining)}`,
      topRows.length > 0 ? "" : null,
      ...topRows.map(
        (row) => `• ${row.employee.fullName}: ${formatCurrencyPair(row.netAmountToPay)}`,
      ),
      buildAppLink("/payroll", "Отвори payroll"),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function executeGetMonthKpis(
  args: Record<string, unknown>,
  restaurantId: string,
): Promise<ExecutionResult> {
  const monthKey = (args.month_key as string | undefined)?.trim() || undefined;
  const result = await getMonthKpis(restaurantId, monthKey);

  return {
    success: true,
    message: [
      `KPI за ${result.monthKey.slice(0, 7)}`,
      `Оборот: ${formatCurrencyPair(result.stats.totalTurnover)}`,
      `Печалба: ${formatCurrencyPair(result.stats.netProfit)}`,
      `Среден дневен оборот: ${formatCurrencyPair(result.stats.averageDailyTurnover)}`,
      `Труд: ${formatCurrencyPair(result.stats.totalLaborCost)} (${result.stats.laborCostPercentage.toFixed(
        1,
      )}%)`,
      `Разходи: ${formatCurrencyPair(result.stats.totalExpense)}`,
      buildAppLink("/profile", "Отвори профила"),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function executeListEmployees(
  args: Record<string, unknown>,
  restaurantId: string,
): Promise<ExecutionResult> {
  const activeOnly = args.active_only !== false;
  const employees = await listEmployeesForRestaurant(restaurantId);
  const visibleEmployees = activeOnly
    ? employees.filter((employee) => employee.isActive)
    : employees;

  if (visibleEmployees.length === 0) {
    return { success: true, message: "Няма намерени служители." };
  }

  return {
    success: true,
    message: [
      activeOnly ? "Активни служители:" : "Служители:",
      ...visibleEmployees.map(
        (employee) =>
          `• ${employee.fullName} (${employee.role === "kitchen" ? "кухня" : "сервиз"})`,
      ),
      buildAppLink("/employees", "Отвори служителите"),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function executeGetOpenActions(restaurantId: string): Promise<ExecutionResult> {
  const actions = await getOpenActions(restaurantId);

  if (actions.length === 0) {
    return {
      success: true,
      message: `Няма спешни отворени задачи.${buildAppLink("/today", "Отвори Today")}`,
    };
  }

  return {
    success: true,
    message: [
      "Какво иска внимание днес:",
      ...actions.map((action) => `• ${action}`),
      buildAppLink("/today", "Отвори приложението"),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function executeSearchContext(
  args: Record<string, unknown>,
  restaurantId: string,
): Promise<ExecutionResult> {
  const query = (args.query as string | undefined)?.trim();
  if (!query) {
    return {
      success: false,
      message: "Моля, задай какво точно да потърся в бележките и контекста.",
    };
  }

  const chunks = await searchRestaurantContext({
    restaurantId,
    query,
    limit: args.limit ? Number(args.limit) : 5,
  });

  if (chunks.length === 0) {
    return {
      success: true,
      message: `Не намерих допълнителен контекст за "${query}".`,
    };
  }

  return {
    success: true,
    message: [
      `Намерих ${chunks.length} свързани записа за "${query}":`,
      ...chunks.map((chunk) => `• ${chunk.chunkText.slice(0, 180).trim()}`),
      buildAppLink("/reports", "Отвори отчетите"),
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function executeSetDailySummaryEnabled(
  args: Record<string, unknown>,
  telegramUserId: string,
): Promise<ExecutionResult> {
  const enabled = args.enabled !== false;
  await setDailySummaryEnabled(telegramUserId, enabled);

  return {
    success: true,
    message: enabled
      ? "Включих дневните Telegram обобщения."
      : "Изключих дневните Telegram обобщения.",
  };
}

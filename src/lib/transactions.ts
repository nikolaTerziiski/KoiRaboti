import type {
  DailyExpenseItem,
  DailyReportWithAttendance,
  ExpenseSourceType,
  SnapshotMode,
} from "@/lib/types";

export interface TransactionRow {
  id: string;
  workDate: string;
  createdAt: string | null;
  description: string;
  categoryLabel: string;
  amount: number;
  hasReceipt: boolean;
  sourceType: ExpenseSourceType;
}

export interface TransactionFilters {
  searchQuery?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ResolvedTransactionRows {
  rows: TransactionRow[];
  isMockData: boolean;
}

const FALLBACK_DESCRIPTION = "Разход без описание";
const FALLBACK_CATEGORY = "Без категория";

function buildSortKey(row: Pick<TransactionRow, "createdAt" | "workDate">) {
  return row.createdAt ?? `${row.workDate}T23:59:59.999Z`;
}

function normalizeTransactionDescription(value: DailyExpenseItem["description"]) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : FALLBACK_DESCRIPTION;
}

function normalizeTransactionCategory(value: DailyExpenseItem["categoryName"]) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : FALLBACK_CATEGORY;
}

export function flattenTransactionRows(
  reports: DailyReportWithAttendance[],
): TransactionRow[] {
  return reports
    .flatMap((report) =>
      report.expenseItems.map((item) => ({
        id: item.id,
        workDate: report.workDate,
        createdAt: item.createdAt,
        description: normalizeTransactionDescription(item.description),
        categoryLabel: normalizeTransactionCategory(item.categoryName),
        amount: item.amount,
        hasReceipt: Boolean(item.receiptImagePath),
        sourceType: item.sourceType,
      })),
    )
    .sort((left, right) => buildSortKey(right).localeCompare(buildSortKey(left)));
}

export function buildMockTransactionRows(): TransactionRow[] {
  return [
    {
      id: "mock-food-delivery",
      workDate: "2026-03-30",
      createdAt: "2026-03-30T08:35:00.000Z",
      description: "Зареждане на зеленчуци, сирена и свежи подправки",
      categoryLabel: "Храна",
      amount: 186.4,
      hasReceipt: true,
      sourceType: "web",
    },
    {
      id: "mock-utilities-power",
      workDate: "2026-03-29",
      createdAt: "2026-03-29T09:15:00.000Z",
      description: "Плащане на електроенергия за кухня и зала",
      categoryLabel: "Комунални",
      amount: 122.95,
      hasReceipt: false,
      sourceType: "web",
    },
    {
      id: "mock-maintenance-fridge",
      workDate: "2026-03-28",
      createdAt: "2026-03-28T11:10:00.000Z",
      description: "Сервиз на хладилна витрина и смяна на уплътнение",
      categoryLabel: "Поддръжка",
      amount: 94.2,
      hasReceipt: true,
      sourceType: "telegram",
    },
    {
      id: "mock-supplies-cleaning",
      workDate: "2026-03-27",
      createdAt: "2026-03-27T13:25:00.000Z",
      description: "Почистващи препарати, ръкавици и консумативи за бар",
      categoryLabel: "Консумативи",
      amount: 58.75,
      hasReceipt: true,
      sourceType: "web",
    },
    {
      id: "mock-drinks-restock",
      workDate: "2026-03-26",
      createdAt: "2026-03-26T16:05:00.000Z",
      description: "Дозареждане на безалкохолни напитки и минерална вода",
      categoryLabel: "Напитки",
      amount: 73.6,
      hasReceipt: true,
      sourceType: "telegram",
    },
    {
      id: "mock-delivery-packaging",
      workDate: "2026-03-25",
      createdAt: "2026-03-25T18:40:00.000Z",
      description: "Кутии за доставка, салфетки и торбички за takeaway",
      categoryLabel: "Консумативи",
      amount: 41.9,
      hasReceipt: false,
      sourceType: "web",
    },
  ];
}

export function resolveTransactionRows(
  reports: DailyReportWithAttendance[],
  dataMode: SnapshotMode,
): ResolvedTransactionRows {
  const flattenedRows = flattenTransactionRows(reports);

  if (dataMode === "demo") {
    return {
      rows: buildMockTransactionRows(),
      isMockData: true,
    };
  }

  return {
    rows: flattenedRows,
    isMockData: false,
  };
}

function normalizeSearchQuery(value: string | undefined) {
  return value?.trim().toLocaleLowerCase("bg-BG") ?? "";
}

export function filterTransactionRows(
  rows: TransactionRow[],
  filters: TransactionFilters,
) {
  const searchQuery = normalizeSearchQuery(filters.searchQuery);

  return rows.filter((row) => {
    if (searchQuery) {
      const haystack = `${row.description} ${row.categoryLabel}`.toLocaleLowerCase("bg-BG");
      if (!haystack.includes(searchQuery)) {
        return false;
      }
    }

    if (filters.fromDate && row.workDate < filters.fromDate) {
      return false;
    }

    if (filters.toDate && row.workDate > filters.toDate) {
      return false;
    }

    return true;
  });
}

function escapeCsvCell(value: string) {
  if (/["\n\r,]/.test(value) || /^\s|\s$/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function formatCsvNumber(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 10000) / 10000;
  const asString = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(4);

  return asString.includes(".") ? asString.replace(/0+$/, "").replace(/\.$/, "") : asString;
}

export function buildTransactionsCsvContent(rows: TransactionRow[]) {
  const csvRows = [
    ["Дата", "Описание", "Категория", "Сума (EUR)", "Източник", "Касова бележка"],
  ];

  for (const row of rows) {
    csvRows.push([
      row.workDate,
      row.description,
      row.categoryLabel,
      formatCsvNumber(row.amount),
      row.sourceType === "telegram" ? "Telegram" : "Уеб",
      row.hasReceipt ? "Да" : "Не",
    ]);
  }

  const csv = csvRows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\r\n");

  return `\uFEFF${csv}`;
}

export function buildTransactionsCsvFilename(label: string) {
  const sanitizedLabel = label
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${sanitizedLabel || "transactions"}.csv`;
}

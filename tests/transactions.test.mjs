import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMockTransactionRows,
  buildTransactionsCsvContent,
  buildTransactionsCsvFilename,
  filterTransactionRows,
  flattenTransactionRows,
  groupTransactionRowsByDate,
  resolveTransactionRows,
} from "../src/lib/transactions.ts";

function createExpense(overrides = {}) {
  return {
    id: "expense-1",
    dailyReportId: "report-1",
    categoryId: null,
    amount: 40,
    amountOriginal: 40,
    currencyOriginal: "EUR",
    description: "Минерална вода",
    receiptImagePath: null,
    receiptOcrText: null,
    sourceType: "web",
    telegramUserId: null,
    categoryName: "Комунални",
    categoryEmoji: null,
    createdAt: "2026-03-30T08:00:00.000Z",
    ...overrides,
  };
}

function createReport(workDate, expenseItems) {
  return {
    id: `report-${workDate}`,
    workDate,
    turnover: 0,
    profit: 0,
    cardAmount: 0,
    manualExpense: expenseItems.reduce((sum, item) => sum + item.amount, 0),
    notes: null,
    attendanceEntries: [],
    expenseItems,
  };
}

test("flattenTransactionRows normalizes fallbacks and sorts by createdAt desc", () => {
  const reports = [
    createReport("2026-03-29", [
      createExpense({
        id: "expense-fallback",
        description: "   ",
        categoryName: null,
        createdAt: null,
        receiptImagePath: "receipts/1.jpg",
      }),
    ]),
    createReport("2026-03-30", [
      createExpense({
        id: "expense-latest",
        description: "Риба и морски дарове",
        categoryName: "Храна",
        createdAt: "2026-03-30T12:15:00.000Z",
      }),
    ]),
  ];

  const rows = flattenTransactionRows(reports);

  assert.equal(rows[0]?.id, "expense-latest");
  assert.equal(rows[1]?.description, "Разход без описание");
  assert.equal(rows[1]?.categoryLabel, "Без категория");
  assert.equal(rows[1]?.hasReceipt, true);
});

test("resolveTransactionRows uses curated mock rows only in demo mode", () => {
  const demoRows = resolveTransactionRows(
    [createReport("2026-03-30", [createExpense()])],
    "demo",
  );
  const emptyRows = resolveTransactionRows([createReport("2026-03-30", [])], "supabase");

  assert.equal(demoRows.isMockData, true);
  assert.equal(emptyRows.isMockData, false);
  assert.equal(demoRows.rows.length, buildMockTransactionRows().length);
  assert.equal(emptyRows.rows.length, 0);
});

test("filterTransactionRows applies text and inclusive date filters", () => {
  const rows = flattenTransactionRows([
    createReport("2026-03-28", [
      createExpense({
        id: "food-row",
        description: "Плодове и зеленчуци",
        categoryName: "Храна",
        createdAt: "2026-03-28T08:00:00.000Z",
      }),
    ]),
    createReport("2026-03-30", [
      createExpense({
        id: "maintenance-row",
        description: "Ремонт на аспирация",
        categoryName: "Поддръжка",
        createdAt: "2026-03-30T08:00:00.000Z",
      }),
    ]),
  ]);

  const filtered = filterTransactionRows(rows, {
    searchQuery: "ремонт",
    fromDate: "2026-03-30",
    toDate: "2026-03-30",
  });

  assert.deepEqual(
    filtered.map((row) => row.id),
    ["maintenance-row"],
  );
});

test("groupTransactionRowsByDate chunks rows and calculates daily totals", () => {
  const rows = flattenTransactionRows([
    createReport("2026-03-29", [
      createExpense({
        id: "day-two-first",
        amount: 18.5,
        createdAt: "2026-03-29T07:00:00.000Z",
      }),
    ]),
    createReport("2026-03-30", [
      createExpense({
        id: "day-one-first",
        amount: 12.25,
        createdAt: "2026-03-30T08:00:00.000Z",
      }),
      createExpense({
        id: "day-one-second",
        amount: 31.75,
        createdAt: "2026-03-30T09:15:00.000Z",
      }),
    ]),
  ]);

  const grouped = groupTransactionRowsByDate(rows);

  assert.deepEqual(
    grouped.map((group) => ({
      workDate: group.workDate,
      totalAmount: group.totalAmount,
      rowIds: group.rows.map((row) => row.id),
    })),
    [
      {
        workDate: "2026-03-30",
        totalAmount: 44,
        rowIds: ["day-one-second", "day-one-first"],
      },
      {
        workDate: "2026-03-29",
        totalAmount: 18.5,
        rowIds: ["day-two-first"],
      },
    ],
  );
});

test("buildTransactionsCsvContent renders Bulgarian headers and row values", () => {
  const csv = buildTransactionsCsvContent([
    {
      id: "expense-1",
      workDate: "2026-03-30",
      createdAt: "2026-03-30T08:00:00.000Z",
      description: "Хляб и млечни продукти",
      categoryLabel: "Храна",
      amount: 84.2,
      hasReceipt: true,
      sourceType: "telegram",
    },
  ]);

  assert.match(csv, /^\uFEFF/);
  assert.match(csv, /Дата,Описание,Категория,Сума \(EUR\),Източник,Касова бележка/);
  assert.match(csv, /2026-03-30,Хляб и млечни продукти,Храна,84\.2,Telegram,Да/);
});

test("buildTransactionsCsvFilename sanitizes filesystem-unsafe symbols", () => {
  assert.equal(
    buildTransactionsCsvFilename(" Март 2026 / ресторант "),
    "Март-2026-ресторант.csv",
  );
  assert.equal(buildTransactionsCsvFilename("   "), "transactions.csv");
});

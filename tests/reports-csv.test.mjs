import assert from "node:assert/strict";
import test from "node:test";
import { buildReportsCsvContent } from "../src/lib/csv-export.ts";

function createReport(workDate, overrides = {}) {
  return {
    id: `report-${workDate}`,
    workDate,
    turnover: 120,
    profit: 90,
    cardAmount: 30,
    manualExpense: 20,
    notes: null,
    attendanceEntries: [],
    ...overrides,
  };
}

test("buildReportsCsvContent includes BOM, Bulgarian headers, and totals", () => {
  const csv = buildReportsCsvContent([
    createReport("2026-03-01"),
    createReport("2026-03-02", { turnover: 80, profit: 70, cardAmount: 25, manualExpense: 10 }),
  ]);

  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("Дата,Оборот,Печалба,Платено с Карта,Разходи,Чиста Печалба"));
  assert.ok(csv.includes("2026-03-01,120,90,30,20,70"));
  assert.ok(csv.includes("2026-03-02,80,70,25,10,60"));
  assert.ok(csv.includes("TOTAL,200,160,55,30,130"));
});

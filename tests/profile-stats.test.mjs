import assert from "node:assert/strict";
import test from "node:test";
import { calculateMonthStats } from "../src/lib/profile-stats.ts";

function createAttendance(overrides = {}) {
  return {
    id: "attendance-1",
    dailyReportId: "report-1",
    employeeId: "employee-1",
    dailyRate: 50,
    payUnits: 1,
    payOverride: null,
    notes: null,
    ...overrides,
  };
}

function createReport(workDate, overrides = {}) {
  return {
    id: `report-${workDate}`,
    workDate,
    turnover: 0,
    profit: 0,
    cardAmount: 0,
    manualExpense: 0,
    notes: null,
    attendanceEntries: [],
    ...overrides,
  };
}

test("calculateMonthStats returns zeros when there are no reports", () => {
  const stats = calculateMonthStats([]);

  assert.equal(stats.recordedDays, 0);
  assert.equal(stats.totalTurnover, 0);
  assert.equal(stats.totalProfit, 0);
  assert.equal(stats.totalExpense, 0);
  assert.equal(stats.netProfit, 0);
  assert.equal(stats.averageDailyTurnover, 0);
  assert.equal(stats.averageDailyProfit, 0);
  assert.equal(stats.totalLaborCost, 0);
  assert.equal(stats.laborCostPercentage, 0);
});

test("calculateMonthStats aggregates KPIs for a month", () => {
  const stats = calculateMonthStats([
    createReport("2026-03-05", {
      turnover: 120,
      profit: 90,
      manualExpense: 20,
      attendanceEntries: [createAttendance({ payUnits: 2 })],
    }),
    createReport("2026-03-07", {
      turnover: 80,
      profit: 60,
      manualExpense: 10,
      attendanceEntries: [createAttendance({ payUnits: 1.5, dailyRate: 40 })],
    }),
  ]);

  assert.equal(stats.recordedDays, 2);
  assert.equal(stats.totalTurnover, 200);
  assert.equal(stats.totalProfit, 150);
  assert.equal(stats.totalExpense, 30);
  assert.equal(stats.netProfit, 120);
  assert.equal(stats.averageDailyTurnover, 100);
  assert.equal(stats.averageDailyProfit, 60);
  assert.equal(stats.totalLaborCost, 160);
  assert.equal(stats.laborCostPercentage, 80);
});

import assert from "node:assert/strict";
import test from "node:test";
import { buildMonthlyStats } from "../src/lib/profile-stats.ts";

const employee = {
  id: "employee-1",
  restaurantId: "restaurant-1",
  firstName: "Test",
  lastName: "Employee",
  fullName: "Test Employee",
  role: "service",
  phoneNumber: null,
  dailyRate: 50,
  isActive: true,
};

function createAttendance(overrides = {}) {
  return {
    id: "attendance-1",
    dailyReportId: "report-1",
    employeeId: employee.id,
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

test("buildMonthlyStats returns zeros when there are no reports", () => {
  const stats = buildMonthlyStats([], [employee], new Date("2026-03-10"));

  assert.equal(stats.recordedDays, 0);
  assert.equal(stats.averageDailyTurnover, 0);
  assert.equal(stats.averageDailyProfit, 0);
  assert.equal(stats.totalTurnover, 0);
  assert.equal(stats.totalNetProfit, 0);
  assert.equal(stats.totalLaborCost, 0);
});

test("buildMonthlyStats aggregates only the current month", () => {
  const stats = buildMonthlyStats(
    [
      createReport("2026-03-05", {
        turnover: 120,
        profit: 90,
        manualExpense: 20,
        attendanceEntries: [createAttendance({ payUnits: 2 })],
      }),
      createReport("2026-02-28", {
        turnover: 999,
        profit: 999,
        manualExpense: 999,
        attendanceEntries: [createAttendance({ payUnits: 1.5 })],
      }),
    ],
    [employee],
    new Date("2026-03-10"),
  );

  assert.equal(stats.recordedDays, 1);
  assert.equal(stats.totalTurnover, 120);
  assert.equal(stats.totalNetProfit, 70);
  assert.equal(stats.averageDailyTurnover, 120);
  assert.equal(stats.averageDailyProfit, 70);
  assert.equal(stats.totalLaborCost, 100);
});

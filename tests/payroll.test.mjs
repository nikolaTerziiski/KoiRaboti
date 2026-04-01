import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPayrollRows,
  getPayrollPresetWindow,
  resolveAttendanceAmount,
  summarizePayrollRows,
} from "../src/lib/payroll.ts";

const employee = {
  id: "employee-1",
  fullName: "Test Employee",
  role: "service",
  phoneNumber: null,
  dailyRate: 100,
  isActive: true,
};

function createAttendance(overrides = {}) {
  return {
    id: "attendance-1",
    dailyReportId: "report-1",
    employeeId: employee.id,
    dailyRate: 50,
    payUnits: 1,
    payOverride: null,
    notes: null,
    ...overrides,
  };
}

function createReport(workDate, attendanceEntries) {
  return {
    id: `report-${workDate}`,
    workDate,
    turnover: 0,
    profit: 0,
    cardAmount: 0,
    manualExpense: 0,
    notes: null,
    attendanceEntries,
    expenseItems: [],
  };
}

function createPayment(overrides = {}) {
  return {
    id: "payment-1",
    employeeId: employee.id,
    amount: 10,
    paymentType: "advance",
    periodStart: null,
    periodEnd: null,
    createdAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

test("resolveAttendanceAmount prefers pay override when present", () => {
  const standardEntry = createAttendance({
    payUnits: 1.5,
  });
  const overriddenEntry = createAttendance({
    payUnits: 2,
    payOverride: 140,
  });

  assert.equal(resolveAttendanceAmount(standardEntry), 75);
  assert.equal(resolveAttendanceAmount(overriddenEntry), 140);
});

test("buildPayrollRows aggregates only the selected date range", () => {
  const reports = [
    createReport("2026-03-10", [createAttendance({ payUnits: 1 })]),
    createReport("2026-03-16", [createAttendance({ payUnits: 2 })]),
    createReport("2026-04-02", [createAttendance({ payUnits: 1.5 })]),
  ];

  const rows = buildPayrollRows(reports, [employee], [], {
    startDate: "2026-03-10",
    endDate: "2026-03-18",
  });

  assert.equal(rows[0]?.totalUnits, 3);
  assert.equal(rows[0]?.totalAmount, 150);
});

test("buildPayrollRows collects worked dates in ascending order", () => {
  const reports = [
    createReport("2026-03-05", [createAttendance({ payUnits: 1 })]),
    createReport("2026-03-01", [createAttendance({ payUnits: 1 })]),
    createReport("2026-03-03", [createAttendance({ payUnits: 1 })]),
  ];

  const rows = buildPayrollRows(reports, [employee], [], {
    startDate: "2026-03-01",
    endDate: "2026-03-05",
  });

  assert.deepEqual(rows[0]?.workedDates, [
    "2026-03-01",
    "2026-03-03",
    "2026-03-05",
  ]);
});

test("buildPayrollRows calculates advances, settlements, and exact payment status", () => {
  const reports = [createReport("2026-03-05", [createAttendance({ payUnits: 1 })])];
  const payments = [
    createPayment({ amount: 20, paymentType: "advance", createdAt: "2026-03-05T10:00:00.000Z" }),
    createPayment({
      id: "payment-2",
      amount: 30,
      paymentType: "payroll",
      periodStart: "2026-03-01",
      periodEnd: "2026-03-15",
    }),
  ];

  const rows = buildPayrollRows(reports, [employee], payments, {
    startDate: "2026-03-01",
    endDate: "2026-03-15",
  });

  assert.equal(rows[0]?.advancesTotal, 20);
  assert.equal(rows[0]?.settlementsTotal, 30);
  assert.equal(rows[0]?.isPaid, true);
  assert.equal(rows[0]?.isSettled, true);
  assert.equal(rows[0]?.netAmountToPay, 0);
});

test("buildPayrollRows surfaces unpaid carryover before the selected range", () => {
  const reports = [createReport("2026-03-01", [createAttendance({ payUnits: 1 })])];

  const rows = buildPayrollRows(reports, [employee], [], {
    startDate: "2026-03-10",
    endDate: "2026-03-15",
  });

  assert.equal(rows[0]?.totalAmount, 0);
  assert.equal(rows[0]?.carryoverAmount, 50);
});

test("summarizePayrollRows returns totals for payroll cards", () => {
  const rows = buildPayrollRows(
    [
      createReport("2026-03-01", [createAttendance({ payUnits: 1 })]),
      createReport(
        "2026-03-05",
        [createAttendance({ payUnits: 1.5, payOverride: 95 })],
      ),
    ],
    [employee],
    [],
    {
      startDate: "2026-03-01",
      endDate: "2026-03-15",
    },
  );

  const summary = summarizePayrollRows(rows);

  assert.equal(summary.employeeCount, 1);
  assert.equal(summary.totalUnits, 2.5);
  assert.equal(summary.totalPayroll, 145);
  assert.equal(summary.overrideDays, 1);
  assert.equal(summary.outstandingTotal, 145);
  assert.equal(summary.carryoverCount, 0);
});

test("getPayrollPresetWindow returns weekly and half-month presets", () => {
  const week = getPayrollPresetWindow("week", new Date("2026-04-10"));
  const firstHalf = getPayrollPresetWindow("first_half", new Date("2026-04-10"));
  const secondHalf = getPayrollPresetWindow("second_half", new Date("2026-04-10"));

  assert.deepEqual(week, {
    startDate: "2026-04-06",
    endDate: "2026-04-12",
  });
  assert.deepEqual(firstHalf, {
    startDate: "2026-04-01",
    endDate: "2026-04-15",
  });
  assert.deepEqual(secondHalf, {
    startDate: "2026-04-16",
    endDate: "2026-04-30",
  });
});

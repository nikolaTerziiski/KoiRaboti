import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPayrollRows,
  getPayrollPeriodBounds,
  resolveAttendanceAmount,
  summarizePayrollRows,
} from "../src/lib/payroll.ts";

const employee = {
  id: "employee-1",
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
  };
}

function createPayment(overrides = {}) {
  return {
    id: "payment-1",
    employeeId: employee.id,
    amount: 10,
    paymentType: "advance",
    payrollMonth: "2026-03-01",
    payrollPeriod: "first_half",
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

  assert.equal(resolveAttendanceAmount(employee, standardEntry), 75);
  assert.equal(resolveAttendanceAmount(employee, overriddenEntry), 140);
});

test("buildPayrollRows aggregates only the selected month and period", () => {
  const reports = [
    createReport("2026-03-10", [createAttendance({ payUnits: 1 })]),
    createReport("2026-03-16", [createAttendance({ payUnits: 2 })]),
    createReport("2026-04-02", [createAttendance({ payUnits: 1.5 })]),
  ];

  const firstHalfRows = buildPayrollRows(
    reports,
    [employee],
    [],
    "first_half",
    new Date("2026-03-20"),
  );
  const secondHalfRows = buildPayrollRows(
    reports,
    [employee],
    [],
    "second_half",
    new Date("2026-03-20"),
  );

  assert.equal(firstHalfRows[0]?.totalUnits, 1);
  assert.equal(firstHalfRows[0]?.totalAmount, 50);
  assert.equal(secondHalfRows[0]?.totalUnits, 2);
  assert.equal(secondHalfRows[0]?.totalAmount, 100);
});

test("buildPayrollRows collects worked dates in ascending order", () => {
  const reports = [
    createReport("2026-03-05", [createAttendance({ payUnits: 1 })]),
    createReport("2026-03-01", [createAttendance({ payUnits: 1 })]),
    createReport("2026-03-03", [createAttendance({ payUnits: 1 })]),
  ];

  const rows = buildPayrollRows(
    reports,
    [employee],
    [],
    "first_half",
    new Date("2026-03-10"),
  );

  assert.deepEqual(rows[0]?.workedDates, [1, 3, 5]);
});

test("buildPayrollRows calculates advances, payment status, and net amount", () => {
  const reports = [createReport("2026-03-05", [createAttendance({ payUnits: 1 })])];
  const payments = [
    createPayment({ amount: 20, paymentType: "advance" }),
    createPayment({
      id: "payment-2",
      amount: 30,
      paymentType: "payroll",
    }),
  ];

  const rows = buildPayrollRows(
    reports,
    [employee],
    payments,
    "first_half",
    new Date("2026-03-10"),
  );

  assert.equal(rows[0]?.advancesTotal, 20);
  assert.equal(rows[0]?.isPaid, true);
  assert.equal(rows[0]?.netAmountToPay, 30);
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
    "first_half",
    new Date("2026-03-10"),
  );

  const summary = summarizePayrollRows(rows);

  assert.equal(summary.employeeCount, 1);
  assert.equal(summary.totalUnits, 2.5);
  assert.equal(summary.totalPayroll, 145);
  assert.equal(summary.overrideDays, 1);
});

test("getPayrollPeriodBounds splits month into first and second half", () => {
  const firstHalf = getPayrollPeriodBounds("first_half", new Date("2026-04-10"));
  const secondHalf = getPayrollPeriodBounds("second_half", new Date("2026-04-10"));

  assert.equal(firstHalf.start.getFullYear(), 2026);
  assert.equal(firstHalf.start.getMonth(), 3);
  assert.equal(firstHalf.start.getDate(), 1);
  assert.equal(firstHalf.end.getFullYear(), 2026);
  assert.equal(firstHalf.end.getMonth(), 3);
  assert.equal(firstHalf.end.getDate(), 15);
  assert.equal(secondHalf.start.getFullYear(), 2026);
  assert.equal(secondHalf.start.getMonth(), 3);
  assert.equal(secondHalf.start.getDate(), 16);
  assert.equal(secondHalf.end.getFullYear(), 2026);
  assert.equal(secondHalf.end.getMonth(), 3);
  assert.equal(secondHalf.end.getDate(), 30);
});



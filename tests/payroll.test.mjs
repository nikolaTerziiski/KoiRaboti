import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPayrollRows,
  getNextPayday,
  getRunningBalance,
  isDueToday,
  resolveAttendanceAmount,
} from "../src/lib/payroll.ts";

function formatLocalDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function createEmployee(overrides = {}) {
  return {
    id: "employee-1",
    restaurantId: "restaurant-1",
    firstName: "Test",
    lastName: "Employee",
    fullName: "Test Employee",
    role: "service",
    phoneNumber: null,
    dailyRate: 100,
    isActive: true,
    useRestaurantPayrollDefaults: true,
    payrollCadence: null,
    weeklyPayday: null,
    monthlyPayDay: null,
    twiceMonthlyDay1: null,
    twiceMonthlyDay2: null,
    paymentSchedule: "twice_monthly",
    paymentDay1: 1,
    paymentDay2: 16,
    paymentWeekday: 1,
    balanceStartsFrom: "2026-01-01",
    ...overrides,
  };
}

function createAttendance(employeeId, overrides = {}) {
  return {
    id: `attendance-${employeeId}-${overrides.dailyReportId ?? "report-1"}`,
    dailyReportId: overrides.dailyReportId ?? "report-1",
    employeeId,
    dailyRate: 100,
    payUnits: 1,
    payOverride: null,
    notes: null,
    workDate: "2026-04-01",
    ...overrides,
  };
}

function createReport(workDate, attendanceEntries = []) {
  return {
    id: `report-${workDate}`,
    workDate,
    turnover: 0,
    profit: 0,
    cardAmount: 0,
    manualExpense: 0,
    notes: null,
    attendanceEntries: attendanceEntries.map((entry) => ({
      ...entry,
      workDate: undefined,
    })),
    expenseItems: [],
  };
}

function createPayment(overrides = {}) {
  return {
    id: "payment-1",
    employeeId: "employee-1",
    amount: 10,
    paymentType: "advance",
    periodStart: null,
    periodEnd: null,
    paidOn: "2026-04-01",
    createdAt: "2026-04-01T10:00:00.000Z",
    ...overrides,
  };
}

test("resolveAttendanceAmount prefers pay override when present", () => {
  const standardEntry = createAttendance("employee-1", {
    payUnits: 1.5,
    dailyRate: 50,
  });
  const overriddenEntry = createAttendance("employee-1", {
    payUnits: 2,
    dailyRate: 50,
    payOverride: 140,
  });

  assert.equal(resolveAttendanceAmount(standardEntry), 75);
  assert.equal(resolveAttendanceAmount(overriddenEntry), 140);
});

test("getNextPayday returns the correct next twice-monthly date", () => {
  const employee = createEmployee({
    paymentSchedule: "twice_monthly",
    paymentDay1: 1,
    paymentDay2: 16,
  });

  assert.equal(
    formatLocalDate(getNextPayday(employee, new Date(2026, 3, 2, 12, 0, 0))),
    "2026-04-16",
  );
});

test("weekly employees become due on the configured weekday", () => {
  const employee = createEmployee({
    paymentSchedule: "weekly",
    paymentWeekday: 5,
  });

  assert.equal(
    formatLocalDate(getNextPayday(employee, new Date(2026, 3, 1, 12, 0, 0))),
    "2026-04-03",
  );
  assert.equal(isDueToday(employee, new Date(2026, 3, 3, 12, 0, 0)), true);
});

test("on-demand employees are always due", () => {
  const employee = createEmployee({
    paymentSchedule: "on_demand",
  });

  assert.equal(isDueToday(employee, new Date("2026-04-18T12:00:00.000Z")), true);
});

test("getRunningBalance respects balance start and payroll reset", () => {
  const employee = createEmployee({
    balanceStartsFrom: "2026-04-01",
  });
  const attendanceEntries = [
    createAttendance(employee.id, { workDate: "2026-03-30" }),
    createAttendance(employee.id, {
      id: "attendance-2",
      dailyReportId: "report-2",
      workDate: "2026-04-01",
    }),
    createAttendance(employee.id, {
      id: "attendance-3",
      dailyReportId: "report-3",
      workDate: "2026-04-03",
      payUnits: 1.5,
    }),
  ];
  const payments = [
    createPayment({
      id: "payroll-reset",
      employeeId: employee.id,
      amount: 100,
      paymentType: "payroll",
      paidOn: "2026-04-01",
      createdAt: "2026-04-01T20:00:00.000Z",
    }),
    createPayment({
      id: "advance-1",
      employeeId: employee.id,
      amount: 30,
      paymentType: "advance",
      paidOn: "2026-04-02",
    }),
  ];

  const balance = getRunningBalance(
    employee,
    attendanceEntries,
    payments,
    new Date("2026-04-03T12:00:00.000Z"),
  );

  assert.equal(balance.totalShifts, 1.5);
  assert.equal(balance.grossAmount, 150);
  assert.equal(balance.advancesTotal, 30);
  assert.equal(balance.netAmount, 120);
  assert.equal(balance.periodStart, "2026-04-02");
  assert.equal(balance.periodEnd, "2026-04-03");
});

test("buildPayrollRows sorts due employees before upcoming ones", () => {
  const dueEmployee = createEmployee({
    id: "employee-due",
    firstName: "Due",
    lastName: "Employee",
    fullName: "Due Employee",
    paymentSchedule: "monthly",
    paymentDay1: 1,
  });
  const upcomingEmployee = createEmployee({
    id: "employee-upcoming",
    firstName: "Upcoming",
    lastName: "Employee",
    fullName: "Upcoming Employee",
    paymentSchedule: "weekly",
    paymentWeekday: 5,
  });
  const reports = [
    createReport("2026-04-01", [createAttendance(dueEmployee.id)]),
    createReport("2026-04-01", [
      createAttendance(upcomingEmployee.id, {
        id: "attendance-upcoming",
        dailyReportId: "report-upcoming",
      }),
    ]),
  ];
  const rows = buildPayrollRows(
    [dueEmployee, upcomingEmployee],
    reports,
    [],
    new Date("2026-04-01T12:00:00.000Z"),
  );

  assert.equal(rows[0]?.employee.id, "employee-due");
  assert.equal(rows[0]?.isDue, true);
  assert.equal(rows[1]?.employee.id, "employee-upcoming");
});

test("buildPayrollRows supports legacy argument order for compatibility", () => {
  const employee = createEmployee();
  const reports = [createReport("2026-04-01", [createAttendance(employee.id)])];
  const rows = buildPayrollRows(reports, [employee], [], {
    startDate: "2026-04-01",
    endDate: "2026-04-01",
  });

  assert.equal(rows[0]?.employee.id, employee.id);
  assert.equal(rows[0]?.grossAmount, 100);
  assert.equal(rows[0]?.netAmountToPay, 100);
  assert.equal(rows[0]?.isSettled, false);
});

test("advances reduce the payable balance", () => {
  const employee = createEmployee({
    paymentSchedule: "monthly",
    paymentDay1: 1,
  });
  const reports = [createReport("2026-04-01", [createAttendance(employee.id)])];
  const payments = [
    createPayment({
      employeeId: employee.id,
      amount: 35,
      paymentType: "advance",
      paidOn: "2026-04-01",
    }),
  ];
  const rows = buildPayrollRows(
    [employee],
    reports,
    payments,
    new Date("2026-04-01T12:00:00.000Z"),
  );

  assert.equal(rows[0]?.grossAmount, 100);
  assert.equal(rows[0]?.advancesTotal, 35);
  assert.equal(rows[0]?.netAmount, 65);
});

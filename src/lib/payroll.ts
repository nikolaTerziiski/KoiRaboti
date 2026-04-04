import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  getISODay,
  parseISO,
  setDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { normalizeEmployeePaymentConfig } from "./employee-payment-schedule.ts";
import type {
  AttendanceEntry,
  DailyReportWithAttendance,
  Employee,
  EmployeeAttendanceEntry,
  EmployeePaymentSchedule,
  PayrollPayment,
  PayrollWindow,
} from "@/lib/types";

export type PayrollWindowPreset = "week" | "month" | "first_half" | "second_half";

export interface PayrollRow {
  employee: Employee;
  paymentSchedule: EmployeePaymentSchedule;
  totalShifts: number;
  grossAmount: number;
  advancesTotal: number;
  netAmount: number;
  isDue: boolean;
  nextPayday: Date;
  lastPaidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  workedDays: number;
  settlementsTotal: number;
  totalUnits: number;
  totalAmount: number;
  netAmountToPay: number;
  isSettled: boolean;
}

export interface PayrollSummary {
  totalPayroll: number;
  totalUnits: number;
  employeeCount: number;
  overrideDays: number;
  outstandingTotal: number;
  carryoverCount: number;
  dueCount: number;
}

type RunningBalance = {
  totalShifts: number;
  grossAmount: number;
  advancesTotal: number;
  netAmount: number;
  periodStart: string | null;
  periodEnd: string | null;
  workedDays: number;
};

function roundPayrollAmount(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function formatDateKey(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function getPaymentDateKey(payment: PayrollPayment) {
  return payment.paidOn ?? payment.createdAt.slice(0, 10);
}

function getMostRecentPayrollPayment(payments: PayrollPayment[]) {
  return payments
    .filter((payment) => payment.paymentType === "payroll")
    .sort((left, right) => {
      const rightDate = getPaymentDateKey(right);
      const leftDate = getPaymentDateKey(left);

      return (
        rightDate.localeCompare(leftDate) ||
        right.createdAt.localeCompare(left.createdAt)
      );
    })[0] ?? null;
}

function resolveReferenceDate(value?: Date | PayrollWindow) {
  if (value instanceof Date) {
    return startOfDay(value);
  }

  if (value && "endDate" in value) {
    return startOfDay(parseISO(value.endDate));
  }

  return startOfDay(new Date());
}

function toAttendanceEntries(
  reports: DailyReportWithAttendance[],
  employeeId: string,
): EmployeeAttendanceEntry[] {
  const entries: EmployeeAttendanceEntry[] = [];

  for (const report of reports) {
    const entry = report.attendanceEntries.find(
      (attendance) => attendance.employeeId === employeeId,
    );

    if (!entry) {
      continue;
    }

    entries.push({
      ...entry,
      workDate: report.workDate,
    });
  }

  return entries.sort((left, right) => left.workDate.localeCompare(right.workDate));
}

function isEmployeesFirstArgument(
  first: Employee[] | DailyReportWithAttendance[],
  second: Employee[] | DailyReportWithAttendance[],
  reference?: Date | PayrollWindow,
) {
  if (reference && "startDate" in reference) {
    return false;
  }

  const firstItem = first[0];
  if (firstItem && "fullName" in firstItem) {
    return true;
  }

  const secondItem = second[0];
  if (secondItem && "fullName" in secondItem) {
    return false;
  }

  return true;
}

function getCurrentMonthCandidate(referenceDate: Date, targetDay: number) {
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const safeDay = Math.min(Math.max(targetDay, 1), monthEnd.getDate());

  return startOfDay(setDate(monthStart, safeDay));
}

function getEarliestActivityDate(
  attendanceEntries: EmployeeAttendanceEntry[],
  payments: PayrollPayment[],
  lowerBound: string,
) {
  let earliestDate: string | null = null;

  for (const entry of attendanceEntries) {
    if (entry.workDate < lowerBound) {
      continue;
    }

    if (earliestDate === null || entry.workDate < earliestDate) {
      earliestDate = entry.workDate;
    }
  }

  for (const payment of payments) {
    if (payment.paymentType !== "advance") {
      continue;
    }

    const paymentDate = getPaymentDateKey(payment);
    if (paymentDate < lowerBound) {
      continue;
    }

    if (earliestDate === null || paymentDate < earliestDate) {
      earliestDate = paymentDate;
    }
  }

  return earliestDate;
}

function compareUpcomingRows(left: PayrollRow, right: PayrollRow) {
  return (
    left.nextPayday.getTime() - right.nextPayday.getTime() ||
    right.netAmount - left.netAmount ||
    left.employee.fullName.localeCompare(right.employee.fullName)
  );
}

export function resolveAttendanceAmount(
  entry: AttendanceEntry,
  employee?: { payType: string; percentageRate: number },
) {
  const basePay = entry.payOverride ?? entry.dailyRate * entry.payUnits;
  const percentageRate =
    entry.percentageRateSnapshot ??
    (employee?.payType === "fixed_plus_percentage" ? employee.percentageRate : null);

  if (
    percentageRate != null &&
    percentageRate > 0 &&
    entry.shiftTurnover != null &&
    entry.shiftTurnover > 0
  ) {
    return basePay + entry.shiftTurnover * percentageRate;
  }

  return basePay;
}

export function getPayrollPresetWindow(
  preset: PayrollWindowPreset,
  referenceDate = new Date(),
): PayrollWindow {
  const monthStart = startOfMonth(referenceDate);

  if (preset === "week") {
    return {
      startDate: formatDateKey(startOfWeek(referenceDate, { weekStartsOn: 1 })),
      endDate: formatDateKey(endOfWeek(referenceDate, { weekStartsOn: 1 })),
    };
  }

  if (preset === "month") {
    return {
      startDate: formatDateKey(monthStart),
      endDate: formatDateKey(endOfMonth(referenceDate)),
    };
  }

  if (preset === "first_half") {
    return {
      startDate: formatDateKey(monthStart),
      endDate: formatDateKey(setDate(monthStart, 15)),
    };
  }

  return {
    startDate: formatDateKey(setDate(monthStart, 16)),
    endDate: formatDateKey(endOfMonth(referenceDate)),
  };
}

export function getNextPayday(employee: Employee, referenceDate: Date) {
  const config = normalizeEmployeePaymentConfig(employee);
  const normalizedReferenceDate = startOfDay(referenceDate);

  if (config.paymentSchedule === "on_demand") {
    return normalizedReferenceDate;
  }

  if (config.paymentSchedule === "weekly") {
    const offset =
      (config.paymentWeekday - getISODay(normalizedReferenceDate) + 7) % 7;
    return startOfDay(addDays(normalizedReferenceDate, offset));
  }

  if (config.paymentSchedule === "monthly") {
    const currentMonthCandidate = getCurrentMonthCandidate(
      normalizedReferenceDate,
      config.paymentDay1,
    );

    if (currentMonthCandidate >= normalizedReferenceDate) {
      return currentMonthCandidate;
    }

    return getCurrentMonthCandidate(
      addDays(endOfMonth(normalizedReferenceDate), 1),
      config.paymentDay1,
    );
  }

  let cursor = normalizedReferenceDate;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const firstCandidate = getCurrentMonthCandidate(cursor, config.paymentDay1);
    if (firstCandidate >= normalizedReferenceDate) {
      return firstCandidate;
    }

    const secondCandidate = getCurrentMonthCandidate(cursor, config.paymentDay2);
    if (secondCandidate >= normalizedReferenceDate) {
      return secondCandidate;
    }

    cursor = addDays(endOfMonth(cursor), 1);
  }

  return getCurrentMonthCandidate(cursor, config.paymentDay2);
}

export function isDueToday(employee: Employee, referenceDate: Date) {
  return getNextPayday(employee, referenceDate).getTime() <= startOfDay(referenceDate).getTime();
}

export function getRunningBalance(
  employee: Employee,
  attendanceEntries: EmployeeAttendanceEntry[],
  payments: PayrollPayment[],
  referenceDate = new Date(),
): RunningBalance {
  const config = normalizeEmployeePaymentConfig(employee);
  const referenceDateKey = formatDateKey(startOfDay(referenceDate));
  const mostRecentPayrollPayment = getMostRecentPayrollPayment(payments);
  const lowerBound =
    mostRecentPayrollPayment === null
      ? config.balanceStartsFrom
      : formatDateKey(
          addDays(parseISO(getPaymentDateKey(mostRecentPayrollPayment)), 1),
        ) > config.balanceStartsFrom
        ? formatDateKey(
            addDays(parseISO(getPaymentDateKey(mostRecentPayrollPayment)), 1),
          )
        : config.balanceStartsFrom;

  const applicableAttendance = attendanceEntries.filter(
    (entry) =>
      entry.workDate >= lowerBound &&
      entry.workDate <= referenceDateKey,
  );
  const applicableAdvances = payments.filter((payment) => {
    if (payment.paymentType !== "advance") {
      return false;
    }

    const paymentDate = getPaymentDateKey(payment);
    return paymentDate >= lowerBound && paymentDate <= referenceDateKey;
  });
  const grossAmount = roundPayrollAmount(
    applicableAttendance.reduce(
      (sum, entry) => sum + resolveAttendanceAmount(entry, employee),
      0,
    ),
  );
  const advancesTotal = roundPayrollAmount(
    applicableAdvances.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const periodStart = getEarliestActivityDate(
    applicableAttendance,
    applicableAdvances,
    lowerBound,
  );
  const uniqueWorkedDays = new Set(
    applicableAttendance.map((entry) => entry.workDate),
  );

  return {
    totalShifts: roundPayrollAmount(
      applicableAttendance.reduce((sum, entry) => sum + entry.payUnits, 0),
    ),
    grossAmount,
    advancesTotal,
    netAmount: roundPayrollAmount(grossAmount - advancesTotal),
    periodStart,
    periodEnd: periodStart ? referenceDateKey : null,
    workedDays: uniqueWorkedDays.size,
  };
}

export function buildPayrollRows(
  employees: Employee[],
  reports: DailyReportWithAttendance[],
  payments?: PayrollPayment[],
  referenceDate?: Date,
): PayrollRow[];
export function buildPayrollRows(
  reports: DailyReportWithAttendance[],
  employees: Employee[],
  payments?: PayrollPayment[],
  referenceWindow?: PayrollWindow,
): PayrollRow[];
export function buildPayrollRows(
  first: Employee[] | DailyReportWithAttendance[],
  second: Employee[] | DailyReportWithAttendance[],
  payments: PayrollPayment[] = [],
  reference?: Date | PayrollWindow,
): PayrollRow[] {
  const employeesFirst = isEmployeesFirstArgument(first, second, reference);
  const employees = employeesFirst
    ? (first as Employee[])
    : (second as Employee[]);
  const reports = employeesFirst
    ? (second as DailyReportWithAttendance[])
    : (first as DailyReportWithAttendance[]);
  const effectiveReferenceDate = resolveReferenceDate(reference);

  return employees
    .map((employee) => {
      const employeeAttendance = toAttendanceEntries(reports, employee.id);
      const employeePayments = payments.filter(
        (payment) => payment.employeeId === employee.id,
      );
      const balance = getRunningBalance(
        employee,
        employeeAttendance,
        employeePayments,
        effectiveReferenceDate,
      );
      const latestPayrollPayment = getMostRecentPayrollPayment(employeePayments);
      const lastPaidAt = latestPayrollPayment
        ? getPaymentDateKey(latestPayrollPayment)
        : null;
      const paymentSchedule = normalizeEmployeePaymentConfig(employee).paymentSchedule;
      const nextPayday = getNextPayday(employee, effectiveReferenceDate);
      const isSettled = balance.netAmount <= 0.0001;
      const settlementsTotal = roundPayrollAmount(
        employeePayments.reduce((sum, payment) => {
          if (payment.paymentType !== "payroll") {
            return sum;
          }

          return sum + payment.amount;
        }, 0),
      );

      return {
        employee,
        paymentSchedule,
        totalShifts: balance.totalShifts,
        grossAmount: balance.grossAmount,
        advancesTotal: balance.advancesTotal,
        netAmount: balance.netAmount,
        isDue: isDueToday(employee, effectiveReferenceDate),
        nextPayday,
        lastPaidAt,
        periodStart: balance.periodStart,
        periodEnd: balance.periodEnd,
        workedDays: balance.workedDays,
        settlementsTotal,
        totalUnits: balance.totalShifts,
        totalAmount: balance.grossAmount,
        netAmountToPay: balance.netAmount,
        isSettled,
      } satisfies PayrollRow;
    })
    .sort((left, right) => {
      const leftDueRank = left.isDue ? 0 : 1;
      const rightDueRank = right.isDue ? 0 : 1;

      if (leftDueRank !== rightDueRank) {
        return leftDueRank - rightDueRank;
      }

      if (left.isDue && right.isDue) {
        const leftOnDemandRank = left.paymentSchedule === "on_demand" ? 1 : 0;
        const rightOnDemandRank = right.paymentSchedule === "on_demand" ? 1 : 0;

        return (
          leftOnDemandRank - rightOnDemandRank ||
          right.netAmount - left.netAmount ||
          left.employee.fullName.localeCompare(right.employee.fullName)
        );
      }

      return compareUpcomingRows(left, right);
    });
}

export function summarizePayrollRows(rows: PayrollRow[]): PayrollSummary {
  return {
    totalPayroll: roundPayrollAmount(
      rows.reduce((sum, row) => sum + row.grossAmount, 0),
    ),
    totalUnits: roundPayrollAmount(
      rows.reduce((sum, row) => sum + row.totalShifts, 0),
    ),
    employeeCount: rows.length,
    overrideDays: 0,
    outstandingTotal: roundPayrollAmount(
      rows.reduce((sum, row) => sum + Math.max(row.netAmount, 0), 0),
    ),
    carryoverCount: 0,
    dueCount: rows.filter((row) => row.isDue && row.netAmount > 0.0001).length,
  };
}

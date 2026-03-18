import {
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  setDate,
  startOfMonth,
} from "date-fns";
import { bg, enUS } from "date-fns/locale";
import type { Locale } from "@/lib/i18n/translations";
import type {
  AttendanceEntry,
  DailyReportWithAttendance,
  Employee,
  PayrollPayment,
  PayrollPeriod,
} from "@/lib/types";

export interface PayrollRow {
  employee: Employee;
  totalUnits: number;
  totalAmount: number;
  overrideCount: number;
  workedDates: number[];
  advancesTotal: number;
  isPaid: boolean;
  netAmountToPay: number;
}

function getDateLocale(locale: Locale) {
  return locale === "bg" ? bg : enUS;
}

export function resolveAttendanceAmount(
  employee: Employee,
  entry: AttendanceEntry,
) {
  return entry.payOverride ?? employee.dailyRate * entry.payUnits;
}

export function getPayrollPeriodBounds(
  period: PayrollPeriod,
  referenceDate = new Date(),
) {
  const start = startOfMonth(referenceDate);

  if (period === "first_half") {
    return {
      start,
      end: setDate(start, 15),
    };
  }

  return {
    start: setDate(start, 16),
    end: endOfMonth(referenceDate),
  };
}

export function getPayrollPeriodLabel(
  period: PayrollPeriod,
  referenceDate = new Date(),
  locale: Locale = "bg",
) {
  const bounds = getPayrollPeriodBounds(period, referenceDate);
  const dateLocale = getDateLocale(locale);

  if (locale === "bg") {
    return `${format(bounds.start, "d MMM", { locale: dateLocale })} - ${format(bounds.end, "d MMM", { locale: dateLocale })}`;
  }

  return `${format(bounds.start, "d MMM", { locale: dateLocale })} to ${format(bounds.end, "d MMM", { locale: dateLocale })}`;
}

export function buildPayrollRows(
  reports: DailyReportWithAttendance[],
  employees: Employee[],
  period: PayrollPeriod,
  referenceDate?: Date,
): PayrollRow[];
export function buildPayrollRows(
  reports: DailyReportWithAttendance[],
  employees: Employee[],
  payments: PayrollPayment[],
  period: PayrollPeriod,
  referenceDate?: Date,
): PayrollRow[];
export function buildPayrollRows(
  reports: DailyReportWithAttendance[],
  employees: Employee[],
  paymentsOrPeriod: PayrollPayment[] | PayrollPeriod,
  periodOrReferenceDate?: PayrollPeriod | Date,
  referenceDate = new Date(),
): PayrollRow[] {
  const hasPayments = Array.isArray(paymentsOrPeriod);
  const payments = hasPayments ? paymentsOrPeriod : [];
  const period = hasPayments
    ? (periodOrReferenceDate as PayrollPeriod)
    : (paymentsOrPeriod as PayrollPeriod);
  const effectiveReferenceDate = hasPayments
    ? referenceDate
    : periodOrReferenceDate instanceof Date
      ? periodOrReferenceDate
      : new Date();
  const bounds = getPayrollPeriodBounds(period, effectiveReferenceDate);
  const payrollMonthKey = format(effectiveReferenceDate, "yyyy-MM-01");

  return employees
    .filter((employee) => employee.isActive)
    .map((employee) => {
      let totalUnits = 0;
      let totalAmount = 0;
      let overrideCount = 0;
      const workedDates: number[] = [];
      let advancesTotal = 0;
      let isPaid = false;

      for (const report of reports) {
        const reportDate = parseISO(report.workDate);
        if (!isWithinInterval(reportDate, bounds)) {
          continue;
        }

        const entry = report.attendanceEntries.find(
          (attendance) => attendance.employeeId === employee.id,
        );

        if (!entry) {
          continue;
        }

        totalUnits += entry.payUnits;
        totalAmount += resolveAttendanceAmount(employee, entry);
        if (entry.payOverride !== null) {
          overrideCount += 1;
        }
        workedDates.push(reportDate.getDate());
      }

      for (const payment of payments) {
        if (
          payment.employeeId !== employee.id ||
          payment.payrollMonth !== payrollMonthKey ||
          payment.payrollPeriod !== period
        ) {
          continue;
        }

        if (payment.paymentType === "advance") {
          advancesTotal += payment.amount;
        }

        if (payment.paymentType === "payroll") {
          isPaid = true;
        }
      }

      return {
        employee,
        totalUnits,
        totalAmount,
        overrideCount,
        workedDates: workedDates.sort((left, right) => left - right),
        advancesTotal,
        isPaid,
        netAmountToPay: totalAmount - advancesTotal,
      };
    })
    .filter((row) => row.totalAmount > 0 || row.advancesTotal > 0 || row.isPaid)
    .sort((left, right) => right.totalAmount - left.totalAmount);
}

export function summarizePayrollRows(rows: PayrollRow[]) {
  return {
    totalPayroll: rows.reduce((sum, row) => sum + row.totalAmount, 0),
    totalUnits: rows.reduce((sum, row) => sum + row.totalUnits, 0),
    employeeCount: rows.length,
    overrideDays: rows.reduce((sum, row) => sum + row.overrideCount, 0),
  };
}

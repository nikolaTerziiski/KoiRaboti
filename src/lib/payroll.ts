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
  PayrollPeriod,
} from "@/lib/types";

export interface PayrollRow {
  employee: Employee;
  totalUnits: number;
  totalAmount: number;
  overrideCount: number;
  workedDates: number[];
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
  referenceDate = new Date(),
): PayrollRow[] {
  const bounds = getPayrollPeriodBounds(period, referenceDate);

  return employees
    .filter((employee) => employee.isActive)
    .map((employee) => {
      let totalUnits = 0;
      let totalAmount = 0;
      let overrideCount = 0;
      const workedDates: number[] = [];

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

      return {
        employee,
        totalUnits,
        totalAmount,
        overrideCount,
        workedDates: workedDates.sort((left, right) => left - right),
      };
    })
    .filter((row) => row.totalAmount > 0)
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

import {
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  setDate,
  startOfMonth,
} from "date-fns";
import type {
  AttendanceEntry,
  DailyReportWithAttendance,
  Employee,
  PayrollPeriod,
} from "@/lib/types";

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
) {
  const bounds = getPayrollPeriodBounds(period, referenceDate);
  return `${format(bounds.start, "d MMM")} to ${format(bounds.end, "d MMM")}`;
}

export function buildPayrollRows(
  reports: DailyReportWithAttendance[],
  employees: Employee[],
  period: PayrollPeriod,
  referenceDate = new Date(),
) {
  const bounds = getPayrollPeriodBounds(period, referenceDate);

  return employees
    .filter((employee) => employee.isActive)
    .map((employee) => {
      let shiftsWorked = 0;
      let totalUnits = 0;
      let totalAmount = 0;
      let overrideCount = 0;

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

        shiftsWorked += Number(entry.shift1) + Number(entry.shift2);
        totalUnits += entry.payUnits;
        totalAmount += resolveAttendanceAmount(employee, entry);
        if (entry.payOverride !== null) {
          overrideCount += 1;
        }
      }

      return {
        employee,
        shiftsWorked,
        totalUnits,
        totalAmount,
        overrideCount,
      };
    })
    .filter((row) => row.totalAmount > 0)
    .sort((left, right) => right.totalAmount - left.totalAmount);
}

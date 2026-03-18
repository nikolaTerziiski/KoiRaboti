import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth } from "date-fns";
import { resolveAttendanceAmount } from "./payroll.ts";
import type { DailyReportWithAttendance, Employee } from "./types.ts";

export type MonthlyStats = {
  monthKey: string;
  recordedDays: number;
  averageDailyTurnover: number;
  averageDailyProfit: number;
  totalTurnover: number;
  totalNetProfit: number;
  totalLaborCost: number;
};

export function buildMonthlyStats(
  reports: DailyReportWithAttendance[],
  employees: Employee[],
  referenceDate = new Date(),
): MonthlyStats {
  const start = startOfMonth(referenceDate);
  const end = endOfMonth(referenceDate);
  const monthKey = format(start, "yyyy-MM-01");
  const employeeIds = new Set(employees.map((employee) => employee.id));

  const monthReports = reports.filter((report) =>
    isWithinInterval(parseISO(report.workDate), { start, end }),
  );

  let totalTurnover = 0;
  let totalNetProfit = 0;
  let totalLaborCost = 0;

  for (const report of monthReports) {
    totalTurnover += report.turnover;
    totalNetProfit += report.profit - report.manualExpense;

    for (const entry of report.attendanceEntries) {
      if (!employeeIds.has(entry.employeeId)) {
        continue;
      }

      totalLaborCost += resolveAttendanceAmount(entry);
    }
  }

  const recordedDays = monthReports.length;
  const divisor = recordedDays > 0 ? recordedDays : 1;

  return {
    monthKey,
    recordedDays,
    averageDailyTurnover: recordedDays > 0 ? totalTurnover / divisor : 0,
    averageDailyProfit: recordedDays > 0 ? totalNetProfit / divisor : 0,
    totalTurnover,
    totalNetProfit,
    totalLaborCost,
  };
}



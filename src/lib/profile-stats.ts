import {
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { DailyReportWithAttendance, Employee } from "./types.ts";
import { resolveAttendanceAmount } from "./payroll.ts";

export type MonthStats = {
  monthKey: string;
  recordedDays: number;
  totalTurnover: number;
  totalProfit: number;
  totalExpense: number;
  netProfit: number;
  totalLaborCost: number;
  averageDailyTurnover: number;
  averageDailyProfit: number;
  laborCostPercentage: number;
};

export type MonthlyStats = MonthStats;

export function calculateMonthStats(
  reports: DailyReportWithAttendance[],
): MonthStats {
  let totalTurnover = 0;
  let totalProfit = 0;
  let totalExpense = 0;
  let totalLaborCost = 0;

  for (const report of reports) {
    totalTurnover += report.turnover;
    totalProfit += report.profit;
    totalExpense += report.manualExpense;

    for (const entry of report.attendanceEntries) {
      totalLaborCost += resolveAttendanceAmount(entry);
    }
  }

  const recordedDays = reports.length;
  const netProfit = totalProfit - totalExpense;
  const monthKey = reports[0]
    ? `${reports[0].workDate.slice(0, 7)}-01`
    : "";

  return {
    monthKey,
    recordedDays,
    totalTurnover,
    totalProfit,
    totalExpense,
    netProfit,
    totalLaborCost,
    averageDailyTurnover: recordedDays > 0 ? totalTurnover / recordedDays : 0,
    averageDailyProfit: recordedDays > 0 ? netProfit / recordedDays : 0,
    laborCostPercentage: totalTurnover > 0 ? (totalLaborCost / totalTurnover) * 100 : 0,
  };
}

export function buildMonthlyStats(
  reports: DailyReportWithAttendance[],
  employeesOrReferenceDate?: Employee[] | Date,
  referenceDate = new Date(),
): MonthStats {
  const effectiveReferenceDate =
    employeesOrReferenceDate instanceof Date ? employeesOrReferenceDate : referenceDate;
  const start = startOfMonth(effectiveReferenceDate);
  const end = endOfMonth(effectiveReferenceDate);
  const monthKey = format(start, "yyyy-MM-01");

  const monthReports = reports.filter((report) =>
    isWithinInterval(parseISO(report.workDate), { start, end }),
  );

  if (Array.isArray(employeesOrReferenceDate)) {
    const employeeIds = new Set(employeesOrReferenceDate.map((employee) => employee.id));

    return {
      ...calculateMonthStats(
        monthReports.map((report) => ({
          ...report,
          attendanceEntries: report.attendanceEntries.filter((entry) =>
            employeeIds.has(entry.employeeId),
          ),
        })),
      ),
      monthKey,
    };
  }

  return {
    ...calculateMonthStats(monthReports),
    monthKey,
  };
}

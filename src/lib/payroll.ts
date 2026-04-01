import {
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  setDate,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { bg, enUS } from "date-fns/locale";
import type { Locale } from "@/lib/i18n/translations";
import type {
  AttendanceEntry,
  DailyReportWithAttendance,
  Employee,
  PayrollPayment,
  PayrollWindow,
} from "@/lib/types";

export type PayrollWindowPreset = "week" | "month" | "first_half" | "second_half";

export interface PayrollRow {
  employee: Employee;
  totalUnits: number;
  totalAmount: number;
  overrideCount: number;
  workedDates: string[];
  advancesTotal: number;
  settlementsTotal: number;
  exactSettlementTotal: number;
  carryoverAmount: number;
  hasOverlappingSettlement: boolean;
  isPaid: boolean;
  isSettled: boolean;
  netAmountToPay: number;
}

function getDateLocale(locale: Locale) {
  return locale === "bg" ? bg : enUS;
}

function roundPayrollAmount(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function formatDateKey(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function getIsoDateKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.slice(0, 10);
}

function isDateWithinWindow(dateKey: string, window: PayrollWindow) {
  return dateKey >= window.startDate && dateKey <= window.endDate;
}

function isWindowContained(
  candidate: PayrollWindow,
  container: PayrollWindow,
) {
  return (
    candidate.startDate >= container.startDate &&
    candidate.endDate <= container.endDate
  );
}

function windowsOverlap(left: PayrollWindow, right: PayrollWindow) {
  return left.startDate <= right.endDate && right.startDate <= left.endDate;
}

function getPayrollPaymentWindow(payment: PayrollPayment): PayrollWindow | null {
  if (!payment.periodStart || !payment.periodEnd) {
    return null;
  }

  return normalizePayrollWindow({
    startDate: payment.periodStart,
    endDate: payment.periodEnd,
  });
}

export function normalizePayrollWindow(window: PayrollWindow): PayrollWindow {
  if (window.startDate <= window.endDate) {
    return window;
  }

  return {
    startDate: window.endDate,
    endDate: window.startDate,
  };
}

export function resolveAttendanceAmount(entry: AttendanceEntry) {
  return entry.payOverride ?? entry.dailyRate * entry.payUnits;
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

export function getPayrollWindowLabel(
  window: PayrollWindow,
  locale: Locale = "bg",
) {
  const normalizedWindow = normalizePayrollWindow(window);
  const dateLocale = getDateLocale(locale);
  const start = parseISO(normalizedWindow.startDate);
  const end = parseISO(normalizedWindow.endDate);
  const startLabel = format(start, "d MMM", { locale: dateLocale });
  const endLabel =
    start.getFullYear() === end.getFullYear()
      ? format(end, "d MMM", { locale: dateLocale })
      : format(end, "d MMM yyyy", { locale: dateLocale });

  if (locale === "bg") {
    return `${startLabel} - ${endLabel}`;
  }

  return `${startLabel} to ${endLabel}`;
}

export function buildPayrollRows(
  reports: DailyReportWithAttendance[],
  employees: Employee[],
  payments: PayrollPayment[] = [],
  window: PayrollWindow,
): PayrollRow[] {
  const normalizedWindow = normalizePayrollWindow(window);

  return employees
    .map((employee) => {
      let totalUnits = 0;
      let totalAmount = 0;
      let overrideCount = 0;
      const workedDates: string[] = [];
      let carryoverEarned = 0;

      for (const report of reports) {
        const entry = report.attendanceEntries.find(
          (attendance) => attendance.employeeId === employee.id,
        );

        if (!entry) {
          continue;
        }

        const amount = resolveAttendanceAmount(entry);

        if (report.workDate < normalizedWindow.startDate) {
          carryoverEarned += amount;
          continue;
        }

        if (!isDateWithinWindow(report.workDate, normalizedWindow)) {
          continue;
        }

        totalUnits += entry.payUnits;
        totalAmount += amount;
        if (entry.payOverride !== null) {
          overrideCount += 1;
        }
        workedDates.push(report.workDate);
      }

      let advancesTotal = 0;
      let advancesBeforeWindow = 0;
      let settlementsTotal = 0;
      let exactSettlementTotal = 0;
      let settlementsBeforeWindow = 0;
      let hasOverlappingSettlement = false;

      for (const payment of payments) {
        if (payment.employeeId !== employee.id) {
          continue;
        }

        if (payment.paymentType === "advance") {
          const paymentDate = getIsoDateKey(payment.createdAt);
          if (!paymentDate) {
            continue;
          }

          if (paymentDate < normalizedWindow.startDate) {
            advancesBeforeWindow += payment.amount;
          }

          if (isDateWithinWindow(paymentDate, normalizedWindow)) {
            advancesTotal += payment.amount;
          }

          continue;
        }

        const paymentWindow = getPayrollPaymentWindow(payment);
        if (!paymentWindow) {
          continue;
        }

        if (paymentWindow.endDate < normalizedWindow.startDate) {
          settlementsBeforeWindow += payment.amount;
        }

        if (isWindowContained(paymentWindow, normalizedWindow)) {
          settlementsTotal += payment.amount;
        }

        if (
          paymentWindow.startDate === normalizedWindow.startDate &&
          paymentWindow.endDate === normalizedWindow.endDate
        ) {
          exactSettlementTotal += payment.amount;
        }

        if (
          windowsOverlap(paymentWindow, normalizedWindow) &&
          !isWindowContained(paymentWindow, normalizedWindow) &&
          !(
            paymentWindow.startDate === normalizedWindow.startDate &&
            paymentWindow.endDate === normalizedWindow.endDate
          )
        ) {
          hasOverlappingSettlement = true;
        }
      }

      const carryoverAmount = roundPayrollAmount(
        carryoverEarned - advancesBeforeWindow - settlementsBeforeWindow,
      );
      const netAmountToPay = roundPayrollAmount(
        totalAmount - advancesTotal - settlementsTotal,
      );
      const isPaid = exactSettlementTotal > 0;
      const isSettled = netAmountToPay <= 0.0001;

      return {
        employee,
        totalUnits,
        totalAmount: roundPayrollAmount(totalAmount),
        overrideCount,
        workedDates: workedDates.sort((left, right) => left.localeCompare(right)),
        advancesTotal: roundPayrollAmount(advancesTotal),
        settlementsTotal: roundPayrollAmount(settlementsTotal),
        exactSettlementTotal: roundPayrollAmount(exactSettlementTotal),
        carryoverAmount,
        hasOverlappingSettlement,
        isPaid,
        isSettled,
        netAmountToPay,
      };
    })
    .filter(
      (row) =>
        row.totalAmount > 0 ||
        row.advancesTotal > 0 ||
        row.settlementsTotal > 0 ||
        row.carryoverAmount > 0 ||
        row.isPaid ||
        row.hasOverlappingSettlement,
    )
    .sort((left, right) => {
      const rightPriority =
        Math.max(right.carryoverAmount, 0) + Math.max(right.netAmountToPay, 0);
      const leftPriority =
        Math.max(left.carryoverAmount, 0) + Math.max(left.netAmountToPay, 0);

      return (
        rightPriority - leftPriority ||
        right.totalAmount - left.totalAmount ||
        left.employee.fullName.localeCompare(right.employee.fullName)
      );
    });
}

export function summarizePayrollRows(rows: PayrollRow[]) {
  return {
    totalPayroll: rows.reduce((sum, row) => sum + row.totalAmount, 0),
    totalUnits: rows.reduce((sum, row) => sum + row.totalUnits, 0),
    employeeCount: rows.length,
    overrideDays: rows.reduce((sum, row) => sum + row.overrideCount, 0),
    outstandingTotal: rows.reduce(
      (sum, row) => sum + Math.max(row.netAmountToPay, 0),
      0,
    ),
    carryoverCount: rows.reduce(
      (sum, row) => sum + (row.carryoverAmount > 0 ? 1 : 0),
      0,
    ),
  };
}

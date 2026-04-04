"use client";

import { useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { bg, enUS } from "date-fns/locale";
import {
  ArrowLeft,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatBgnCurrencyFromEur,
  formatCurrency,
} from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";
import { resolveAttendanceAmount } from "@/lib/payroll";
import type { Employee, EmployeeAttendanceEntry, PayrollPayment } from "@/lib/types";
import { cn } from "@/lib/utils";

type EmployeeTimesheetClientProps = {
  employee: Employee;
  attendanceEntries: EmployeeAttendanceEntry[];
  payments: PayrollPayment[];
};

type CurrencyMode = "EUR" | "BGN";

function getDateLocale(locale: "bg" | "en") {
  return locale === "bg" ? bg : enUS;
}

function getPaymentDateKey(payment: PayrollPayment) {
  return payment.paidOn ?? payment.createdAt.slice(0, 10);
}

function formatAmount(amount: number, currencyMode: CurrencyMode) {
  return currencyMode === "BGN"
    ? {
        primary: formatBgnCurrencyFromEur(amount),
        secondary: formatCurrency(amount),
      }
    : {
        primary: formatCurrency(amount),
        secondary: formatBgnCurrencyFromEur(amount),
    };
}

function formatShortDate(value: string, locale: "bg" | "en") {
  return format(parseISO(value), "d MMM yyyy", {
    locale: getDateLocale(locale),
  });
}

function formatShiftValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getInitialMonth(attendanceEntries: EmployeeAttendanceEntry[], payments: PayrollPayment[]) {
  const latestAttendance = attendanceEntries
    .map((entry) => entry.workDate)
    .sort((left, right) => right.localeCompare(left))[0];
  const latestPayment = payments
    .map(getPaymentDateKey)
    .sort((left, right) => right.localeCompare(left))[0];
  const initialDateKey = latestAttendance ?? latestPayment ?? new Date().toISOString().slice(0, 10);

  return startOfMonth(parseISO(initialDateKey));
}

function getWeekdayShortLabels(locale: "bg" | "en") {
  const start = startOfWeek(new Date("2026-01-05T12:00:00.000Z"), {
    weekStartsOn: 1,
  });

  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(start, index), "EEE", {
      locale: getDateLocale(locale),
    }),
  );
}

function getScheduleSummary(employee: Employee, t: ReturnType<typeof useLocale>["t"], locale: "bg" | "en") {
  if (employee.paymentSchedule === "weekly") {
    return `${t.employees.weekly} (${format(addDays(startOfWeek(new Date("2026-01-05T12:00:00.000Z"), { weekStartsOn: 1 }), (employee.paymentWeekday ?? 1) - 1), "EEEE", {
      locale: getDateLocale(locale),
    })})`;
  }

  if (employee.paymentSchedule === "monthly") {
    return `${t.employees.monthly} (${employee.paymentDay1 ?? 1})`;
  }

  if (employee.paymentSchedule === "on_demand") {
    return t.employees.onDemand;
  }

  return `${t.employees.twiceMonthly} (${employee.paymentDay1 ?? 1} / ${employee.paymentDay2 ?? 16})`;
}

export function EmployeeTimesheetClient({
  employee,
  attendanceEntries,
  payments,
}: EmployeeTimesheetClientProps) {
  const { t, locale } = useLocale();
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>("EUR");
  const [visiblePaymentsCount, setVisiblePaymentsCount] = useState(10);
  const [currentMonth, setCurrentMonth] = useState(() =>
    getInitialMonth(attendanceEntries, payments),
  );
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = [];

  for (
    let cursor = calendarStart;
    cursor <= calendarEnd;
    cursor = addDays(cursor, 1)
  ) {
    calendarDays.push(cursor);
  }

  const monthKey = format(currentMonth, "yyyy-MM");
  const monthAttendance = attendanceEntries.filter((entry) =>
    entry.workDate.startsWith(monthKey),
  );
  const monthWorkedDayCount = new Set(monthAttendance.map((entry) => entry.workDate)).size;
  const monthTotalShifts = monthAttendance.reduce(
    (sum, entry) => sum + entry.payUnits,
    0,
  );
  const monthEarned = monthAttendance.reduce(
    (sum, entry) => sum + resolveAttendanceAmount(entry, employee),
    0,
  );
  const monthPaid = payments.reduce((sum, payment) => {
    if (payment.paymentType !== "payroll") {
      return sum;
    }

    return getPaymentDateKey(payment).startsWith(monthKey)
      ? sum + payment.amount
      : sum;
  }, 0);
  const historyPayments = [...payments].sort((left, right) => {
    const rightDate = getPaymentDateKey(right);
    const leftDate = getPaymentDateKey(left);

    return (
      rightDate.localeCompare(leftDate) ||
      right.createdAt.localeCompare(left.createdAt)
    );
  });
  const currentRateDisplay = formatAmount(employee.dailyRate, currencyMode);
  const monthEarnedDisplay = formatAmount(monthEarned, currencyMode);
  const monthPaidDisplay = formatAmount(monthPaid, currencyMode);
  const weekdayLabels = getWeekdayShortLabels(locale);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-28 lg:pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" className="h-10 w-fit rounded-2xl px-0">
          <Link href="/employees">
            <ArrowLeft className="size-4" />
            {t.employees.backToEmployees}
          </Link>
        </Button>

        <div className="grid grid-cols-2 gap-2">
          {(["EUR", "BGN"] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              variant={currencyMode === mode ? "default" : "outline"}
              aria-pressed={currencyMode === mode}
              onClick={() => setCurrencyMode(mode)}
              className={cn(
                "h-10 rounded-2xl px-4",
                currencyMode === mode
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-900",
              )}
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      <section className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className={
              employee.role === "kitchen"
                ? "border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                : "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
            }
          >
            {employee.role === "kitchen" ? t.common.kitchen : t.common.service}
          </Badge>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {currentRateDisplay.primary} / {t.common.perDay}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {currentRateDisplay.secondary}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.employees.paymentSchedule}: {getScheduleSummary(employee, t, locale)}
          </p>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t.employees.workedDays}
          </h2>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-2xl"
              onClick={() => setCurrentMonth((current) => subMonths(current, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-36 text-center text-sm font-semibold text-slate-900 dark:text-white">
              {format(currentMonth, "LLLL yyyy", { locale: getDateLocale(locale) })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-2xl"
              onClick={() => setCurrentMonth((current) => addMonths(current, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {weekdayLabels.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayAttendance = attendanceEntries.filter((entry) => entry.workDate === dayKey);
            const dayShiftTotal = dayAttendance.reduce((sum, entry) => sum + entry.payUnits, 0);
            const hasAdvance = payments.some(
              (payment) =>
                payment.paymentType === "advance" &&
                getPaymentDateKey(payment) === dayKey,
            );
            const hasPayroll = payments.some(
              (payment) =>
                payment.paymentType === "payroll" &&
                getPaymentDateKey(payment) === dayKey,
            );

            return (
              <div
                key={dayKey}
                className={cn(
                  "relative min-h-24 rounded-2xl border p-2 text-left",
                  !isSameMonth(day, currentMonth)
                    ? "border-slate-200/50 bg-slate-50/60 opacity-45 dark:border-slate-800/50 dark:bg-slate-950/40"
                    : dayShiftTotal >= 2
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : dayShiftTotal >= 1.5
                        ? "border-emerald-200 bg-emerald-200 text-emerald-950"
                        : dayShiftTotal >= 1
                          ? "border-slate-200 bg-slate-200 text-slate-900 dark:border-slate-700 dark:bg-slate-700 dark:text-white"
                          : "border-slate-200/70 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400",
                )}
              >
                <div className="text-sm font-semibold">{format(day, "d")}</div>

                {dayShiftTotal > 0 ? (
                  <div className="mt-4 text-sm font-semibold">
                    {formatShiftValue(dayShiftTotal)}×
                  </div>
                ) : null}

                {hasAdvance ? (
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-500" />
                ) : null}

                {hasPayroll ? (
                  <CheckCheck className="absolute bottom-2 right-2 size-4 text-emerald-600 dark:text-emerald-300" />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {t.employees.monthSummary}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.employees.workedDays}
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                {monthWorkedDayCount}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.payroll.shiftCountUnit}
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                {formatShiftValue(monthTotalShifts)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.payroll.earned}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {monthEarnedDisplay.primary}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {monthEarnedDisplay.secondary}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.employees.payrollPayment}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {monthPaidDisplay.primary}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {monthPaidDisplay.secondary}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {t.employees.paymentHistory}
        </h2>

        {historyPayments.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
            {t.employees.noPaymentHistory}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {historyPayments.slice(0, visiblePaymentsCount).map((payment) => {
              const amountDisplay = formatAmount(payment.amount, currencyMode);

              return (
                <div
                  key={payment.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {formatShortDate(getPaymentDateKey(payment), locale)}
                    </span>
                    <span>·</span>
                    <span>
                      {payment.paymentType === "advance"
                        ? t.employees.advancePayment
                        : t.employees.payrollPayment}
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {amountDisplay.primary}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {amountDisplay.secondary}
                    </p>
                  </div>
                </div>
              );
            })}

            {historyPayments.length > visiblePaymentsCount ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() => setVisiblePaymentsCount((current) => current + 10)}
              >
                {t.employees.loadMore}
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

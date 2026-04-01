"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MoneyDisplay } from "@/components/ui/money-display";
import { useLocale } from "@/lib/i18n/context";
import {
  buildPayrollRows,
  getPayrollPresetWindow,
  getPayrollWindowLabel,
  type PayrollWindowPreset,
  summarizePayrollRows,
} from "@/lib/payroll";
import { PayrollEmployeeCard } from "@/components/payroll/payroll-employee-card";
import { cn } from "@/lib/utils";
import type {
  DailyReportWithAttendance,
  Employee,
  EmployeeRole,
  PayrollPayment,
  SnapshotMode,
} from "@/lib/types";

type PayrollPageClientProps = {
  employees: Employee[];
  reports: DailyReportWithAttendance[];
  payments: PayrollPayment[];
  dataMode: SnapshotMode;
};

const ROLE_ORDER: EmployeeRole[] = ["kitchen", "service"];

const PRESET_ORDER: PayrollWindowPreset[] = [
  "week",
  "month",
  "first_half",
  "second_half",
];

function getLatestReportDate(reports: DailyReportWithAttendance[]) {
  const sortedDates = reports
    .map((report) => report.workDate)
    .sort((left, right) => left.localeCompare(right));

  return sortedDates.at(-1) ?? format(new Date(), "yyyy-MM-dd");
}

export function PayrollPageClient({
  employees,
  reports,
  payments,
  dataMode,
}: PayrollPageClientProps) {
  const { t, locale } = useLocale();
  const referenceDateKey = getLatestReportDate(reports);
  const initialWindow = getPayrollPresetWindow("week", parseISO(referenceDateKey));
  const [startDate, setStartDate] = useState(initialWindow.startDate);
  const [endDate, setEndDate] = useState(initialWindow.endDate);
  const [selectedPreset, setSelectedPreset] = useState<PayrollWindowPreset | null>("week");

  const payrollWindow =
    startDate <= endDate
      ? { startDate, endDate }
      : { startDate: endDate, endDate: startDate };
  const payrollRows = buildPayrollRows(reports, employees, payments, payrollWindow);
  const summary = summarizePayrollRows(payrollRows);

  const roleSections = ROLE_ORDER.map((role) => {
    const rows = payrollRows.filter((row) => row.employee.role === role);
    return {
      role,
      title: role === "kitchen" ? t.common.kitchen : t.common.service,
      rows,
    };
  }).filter((section) => section.rows.length > 0);

  function applyPreset(preset: PayrollWindowPreset) {
    const anchorDate = parseISO(endDate || referenceDateKey);
    const nextWindow = getPayrollPresetWindow(preset, anchorDate);
    setStartDate(nextWindow.startDate);
    setEndDate(nextWindow.endDate);
    setSelectedPreset(preset);
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (value > endDate) {
      setEndDate(value);
    }
    setSelectedPreset(null);
  }

  function handleEndDateChange(value: string) {
    setEndDate(value);
    if (value < startDate) {
      setStartDate(value);
    }
    setSelectedPreset(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-28 lg:pb-10">
      <Card className="overflow-hidden border-slate-200/60 shadow-sm dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 pb-4 dark:bg-slate-900/50">
          <CardTitle>{t.payroll.window}</CardTitle>
          <CardDescription>{t.payroll.windowDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESET_ORDER.map((preset) => {
              const label =
                preset === "week"
                  ? t.payroll.weekPreset
                  : preset === "month"
                    ? t.payroll.monthPreset
                    : preset === "first_half"
                      ? t.payroll.firstHalf
                      : t.payroll.secondHalf;

              return (
                <Button
                  key={preset}
                  type="button"
                  variant={selectedPreset === preset ? "default" : "outline"}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "h-11 rounded-xl font-semibold transition-all",
                    selectedPreset === preset
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                  )}
                >
                  {label}
                </Button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                htmlFor="payroll-start-date"
              >
                {t.payroll.rangeStart}
              </label>
              <Input
                id="payroll-start-date"
                type="date"
                value={startDate}
                onChange={(event) => handleStartDateChange(event.target.value)}
                className="h-12 rounded-xl text-base font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                htmlFor="payroll-end-date"
              >
                {t.payroll.rangeEnd}
              </label>
              <Input
                id="payroll-end-date"
                type="date"
                value={endDate}
                onChange={(event) => handleEndDateChange(event.target.value)}
                className="h-12 rounded-xl text-base font-semibold"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100/60 bg-emerald-50/40 px-4 py-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-500/70">
              {t.payroll.activeRange}
            </p>
            <p className="mt-1 text-base font-bold text-emerald-900 dark:text-emerald-100">
              {getPayrollWindowLabel(payrollWindow, locale)}
            </p>
            <p className="mt-0.5 text-xs text-emerald-700/60 dark:text-emerald-400/60">
              {dataMode === "demo" ? t.payroll.demoAttendance : t.payroll.supabaseAttendance}
            </p>
          </div>
        </CardContent>
      </Card>

      {summary.carryoverCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {t.payroll.carryoverWarning.replace(
            "{count}",
            String(summary.carryoverCount),
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: t.payroll.totalPayroll,
            value: <MoneyDisplay amount={summary.totalPayroll} compact />,
          },
          {
            label: t.payroll.netToPay,
            value: <MoneyDisplay amount={summary.outstandingTotal} compact />,
          },
          {
            label: t.payroll.staffPaid,
            value: (
              <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {summary.employeeCount}
              </p>
            ),
          },
          {
            label: t.payroll.shiftsCount,
            value: (
              <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {summary.totalUnits.toFixed(1)}
              </p>
            ),
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-slate-200/60 shadow-sm dark:border-slate-800">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {kpi.label}
              </p>
              {kpi.value}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="px-1 text-lg font-bold text-slate-900 dark:text-white">
          {t.payroll.payrollRows}
        </h2>

        {payrollRows.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-slate-800">
            {t.payroll.noAttendance}
          </div>
        )}

        {roleSections.map(({ role, title, rows }) => (
          <div
            key={role}
            className="rounded-2xl border border-slate-200/60 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-900/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {title}
              </span>
              <Badge
                variant="outline"
                className="border-slate-200 bg-white text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
              >
                {rows.length}
              </Badge>
            </div>

            <div className="space-y-3">
              {rows.map((row) => (
                <PayrollEmployeeCard
                  key={row.employee.id}
                  row={row}
                  periodStart={payrollWindow.startDate}
                  periodEnd={payrollWindow.endDate}
                  dataMode={dataMode}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

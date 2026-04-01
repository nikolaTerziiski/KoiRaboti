"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MoneyDisplay } from "@/components/ui/money-display";
import { SelectField } from "@/components/ui/select-field";
import { useLocale } from "@/lib/i18n/context";
import { formatMonthLabel } from "@/lib/format";
import {
  buildPayrollRows,
  getPayrollPeriodLabel,
  summarizePayrollRows,
} from "@/lib/payroll";
import { PayrollEmployeeCard } from "@/components/payroll/payroll-employee-card";
import type {
  DailyReportWithAttendance,
  Employee,
  EmployeeRole,
  PayrollPeriod,
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

export function PayrollPageClient({
  employees,
  reports,
  payments,
  dataMode,
}: PayrollPageClientProps) {
  const { t, locale } = useLocale();
  const monthOptions = Array.from(
    new Set(reports.map((report) => `${report.workDate.slice(0, 7)}-01`)),
  );
  const fallbackMonth = format(new Date(), "yyyy-MM-01");
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0] ?? fallbackMonth);
  const [period, setPeriod] = useState<PayrollPeriod>("first_half");

  const referenceDate = parseISO(selectedMonth);
  const payrollRows = buildPayrollRows(reports, employees, payments, period, referenceDate);
  const summary = summarizePayrollRows(payrollRows);

  const roleSections = ROLE_ORDER.map((role) => {
    const rows = payrollRows.filter((row) => row.employee.role === role);
    return {
      role,
      title: role === "kitchen" ? t.common.kitchen : t.common.service,
      rows,
    };
  }).filter((section) => section.rows.length > 0);

  return (
    // pb-28 matches app-shell.tsx and clears the mobile nav + safe-area-inset-bottom
    <div className="mx-auto max-w-5xl space-y-4 pb-28 lg:pb-10">

      {/* ── Period selector ─────────────────────────────────────── */}
      <Card className="overflow-hidden border-slate-200/60 shadow-sm dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 pb-4 dark:bg-slate-900/50">
          <CardTitle>{t.payroll.window}</CardTitle>
          <CardDescription>{t.payroll.windowDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">

          {/* Month dropdown */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              htmlFor="payroll-month"
            >
              {t.payroll.month}
            </label>
            <SelectField
              id="payroll-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-12 rounded-xl text-base font-semibold"
            >
              {(monthOptions.length > 0 ? monthOptions : [fallbackMonth]).map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month, locale)}
                </option>
              ))}
            </SelectField>
          </div>

          {/* Period toggle — segmented control */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={period === "first_half" ? "default" : "outline"}
              onClick={() => setPeriod("first_half")}
              className={cn(
                "h-11 rounded-xl font-semibold transition-all",
                period === "first_half"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              )}
            >
              {t.payroll.firstHalf}
            </Button>
            <Button
              type="button"
              variant={period === "second_half" ? "default" : "outline"}
              onClick={() => setPeriod("second_half")}
              className={cn(
                "h-11 rounded-xl font-semibold transition-all",
                period === "second_half"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              )}
            >
              {t.payroll.secondHalf}
            </Button>
          </div>

          {/* Active period display */}
          <div className="rounded-2xl border border-emerald-100/60 bg-emerald-50/40 px-4 py-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-500/70">
              {t.payroll.activeRange}
            </p>
            <p className="mt-1 text-base font-bold text-emerald-900 dark:text-emerald-100">
              {getPayrollPeriodLabel(period, referenceDate, locale)}
            </p>
            <p className="mt-0.5 text-xs text-emerald-700/60 dark:text-emerald-400/60">
              {dataMode === "demo" ? t.payroll.demoAttendance : t.payroll.supabaseAttendance}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary KPI row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: t.payroll.totalPayroll,
            value: <MoneyDisplay amount={summary.totalPayroll} compact />,
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
          {
            label: t.payroll.overrides,
            value: (
              <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {summary.overrideDays}
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

      {/* ── Employee payroll rows ────────────────────────────────── */}
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
            {/* Section header */}
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

            {/* Cards */}
            <div className="space-y-3">
              {rows.map((row) => (
                <PayrollEmployeeCard
                  key={row.employee.id}
                  row={row}
                  payrollMonth={selectedMonth}
                  payrollPeriod={period}
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

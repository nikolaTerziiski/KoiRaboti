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
import { formatExchangeRateLabel, formatMonthLabel } from "@/lib/format";
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
    // UX FIX: Removed distracting role-based background colors.
    const sectionClass = "border-slate-200/70 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30";
    const badgeClass = "bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

    return {
      role,
      title: role === "kitchen" ? t.common.kitchen : t.common.service,
      rows,
      sectionClass,
      badgeClass,
    };
  }).filter((section) => section.rows.length > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <Card className="overflow-hidden border-slate-200/60 shadow-sm dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 pb-6 dark:bg-slate-900/50">
          <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {t.payroll.window}
          </CardTitle>
          <CardDescription className="text-base text-slate-500">
            {t.payroll.windowDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500" htmlFor="payroll-month">
              {t.payroll.month}
            </label>
            <SelectField
              id="payroll-month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="h-14 rounded-2xl text-lg font-semibold shadow-sm"
            >
              {(monthOptions.length > 0 ? monthOptions : [fallbackMonth]).map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month, locale)}
                </option>
              ))}
            </SelectField>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={period === "first_half" ? "default" : "outline"}
              onClick={() => setPeriod("first_half")}
              className={cn(
                "h-14 rounded-2xl text-base font-bold transition-all",
                period === "first_half" 
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
              )}
            >
              {t.payroll.firstHalf}
            </Button>
            <Button
              type="button"
              variant={period === "second_half" ? "default" : "outline"}
              onClick={() => setPeriod("second_half")}
              className={cn(
                "h-14 rounded-2xl text-base font-bold transition-all",
                period === "second_half" 
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
              )}
            >
              {t.payroll.secondHalf}
            </Button>
          </div>
          
          <div className="rounded-[1.5rem] bg-emerald-50/50 p-5 border border-emerald-100/50 dark:bg-emerald-950/20 dark:border-emerald-900/30">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-500/80">
              {t.payroll.activeRange}
            </p>
            <p className="mt-2 text-xl font-extrabold text-emerald-900 dark:text-emerald-100">
              {getPayrollPeriodLabel(period, referenceDate, locale)}
            </p>
            <p className="mt-2 text-sm text-emerald-700/70 dark:text-emerald-400/70">
              {dataMode === "demo" ? t.payroll.demoAttendance : t.payroll.supabaseAttendance}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="rounded-3xl border-slate-200/60 shadow-sm dark:border-slate-800">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {t.payroll.totalPayroll}
            </p>
            <div className="mt-3">
              <MoneyDisplay amount={summary.totalPayroll} className="text-2xl font-extrabold text-slate-900 dark:text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-200/60 shadow-sm dark:border-slate-800">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {t.payroll.staffPaid}
            </p>
            <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{summary.employeeCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-200/60 shadow-sm dark:border-slate-800">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {t.payroll.shiftsCount}
            </p>
            <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{summary.totalUnits.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-200/60 shadow-sm dark:border-slate-800">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {t.payroll.overrides}
            </p>
            <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{summary.overrideDays}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t.payroll.payrollRows}</h2>
        </div>
        
        {payrollRows.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed border-slate-200 p-10 text-center text-slate-500 dark:border-slate-800">
            {t.payroll.noAttendance}
          </div>
        ) : null}

        {roleSections.map((section) => (
          <div key={section.role} className={cn("rounded-[2rem] border p-5 md:p-6", section.sectionClass)}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-lg font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">{section.title}</h3>
              <Badge className={cn("rounded-full px-3 py-1 text-sm font-bold", section.badgeClass)} variant="outline">
                {section.rows.length}
              </Badge>
            </div>
            <div className="space-y-4">
              {section.rows.map((row) => (
                <PayrollEmployeeCard
                  key={row.employee.id}
                  row={row}
                  payrollMonth={selectedMonth}
                  payrollPeriod={period}
                  dataMode={dataMode}
                />
              ))}
              {section.rows.length === 0 ? (
                <p className="text-sm text-slate-500">{t.payroll.noRows}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
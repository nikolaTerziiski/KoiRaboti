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
    const sectionClass =
      role === "kitchen"
        ? "border-purple-500/20 bg-purple-500/5"
        : "border-green-500/20 bg-green-500/5";
    const badgeClass =
      role === "kitchen"
        ? "border-purple-200 bg-purple-100 text-purple-700"
        : "border-green-200 bg-green-100 text-green-700";

    return {
      role,
      title: role === "kitchen" ? t.common.kitchen : t.common.service,
      rows,
      sectionClass,
      badgeClass,
    };
  }).filter((section) => section.rows.length > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.payroll.window}</CardTitle>
          <CardDescription>{t.payroll.windowDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="payroll-month">
              {t.payroll.month}
            </label>
            <SelectField
              id="payroll-month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              {(monthOptions.length > 0 ? monthOptions : [fallbackMonth]).map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month, locale)}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={period === "first_half" ? "default" : "outline"}
              onClick={() => setPeriod("first_half")}
            >
              {t.payroll.firstHalf}
            </Button>
            <Button
              type="button"
              variant={period === "second_half" ? "default" : "outline"}
              onClick={() => setPeriod("second_half")}
            >
              {t.payroll.secondHalf}
            </Button>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.payroll.activeRange}
            </p>
            <p className="mt-2 text-lg font-semibold">
              {getPayrollPeriodLabel(period, referenceDate, locale)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {dataMode === "demo" ? t.payroll.demoAttendance : t.payroll.supabaseAttendance}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.payroll.bgnRate} {formatExchangeRateLabel()}.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.payroll.totalPayroll}
            </p>
            <div className="mt-2">
              <MoneyDisplay amount={summary.totalPayroll} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.payroll.staffPaid}
            </p>
            <p className="mt-2 text-xl font-semibold">{summary.employeeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.payroll.shiftsCount}
            </p>
            <p className="mt-2 text-xl font-semibold">{summary.totalUnits.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.payroll.overrides}
            </p>
            <p className="mt-2 text-xl font-semibold">{summary.overrideDays}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.payroll.payrollRows}</CardTitle>
          <CardDescription>{t.payroll.payrollRowsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {payrollRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t.payroll.noAttendance}
            </div>
          ) : null}

          {roleSections.map((section) => (
            <div key={section.role} className={cn("rounded-2xl border p-4", section.sectionClass)}>
              <div className="flex items-center justify-between gap-3 pb-3">
                <h3 className="text-lg font-semibold">{section.title}</h3>
                <Badge className={section.badgeClass} variant="outline">
                  {section.rows.length}
                </Badge>
              </div>
              <div className="space-y-2">
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
                  <p className="text-sm text-muted-foreground">{t.payroll.noRows}</p>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

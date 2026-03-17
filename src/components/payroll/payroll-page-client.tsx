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
import { MoneyDisplay } from "@/components/ui/money-display";
import { SelectField } from "@/components/ui/select-field";
import { formatExchangeRateLabel, formatMonthLabel } from "@/lib/format";
import {
  buildPayrollRows,
  getPayrollPeriodLabel,
  summarizePayrollRows,
} from "@/lib/payroll";
import type {
  DailyReportWithAttendance,
  Employee,
  PayrollPeriod,
  SnapshotMode,
} from "@/lib/types";

type PayrollPageClientProps = {
  employees: Employee[];
  reports: DailyReportWithAttendance[];
  dataMode: SnapshotMode;
};

export function PayrollPageClient({
  employees,
  reports,
  dataMode,
}: PayrollPageClientProps) {
  const monthOptions = Array.from(
    new Set(reports.map((report) => `${report.workDate.slice(0, 7)}-01`)),
  );
  const fallbackMonth = format(new Date(), "yyyy-MM-01");
  const [selectedMonth, setSelectedMonth] = useState(
    monthOptions[0] ?? fallbackMonth,
  );
  const [period, setPeriod] = useState<PayrollPeriod>("first_half");

  const referenceDate = parseISO(selectedMonth);
  const payrollRows = buildPayrollRows(reports, employees, period, referenceDate);
  const summary = summarizePayrollRows(payrollRows);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payroll window</CardTitle>
          <CardDescription>
            Split wages into the two required monthly periods.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="payroll-month">
              Month
            </label>
            <SelectField
              id="payroll-month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              {(monthOptions.length > 0 ? monthOptions : [fallbackMonth]).map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
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
              1st to 15th
            </Button>
            <Button
              type="button"
              variant={period === "second_half" ? "default" : "outline"}
              onClick={() => setPeriod("second_half")}
            >
              16th to month end
            </Button>
          </div>
          <div className="rounded-2xl bg-secondary/35 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Active range
            </p>
            <p className="mt-2 text-lg font-semibold">
              {getPayrollPeriodLabel(period, referenceDate)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {dataMode === "demo"
                ? "Using demo attendance seeded from recent days."
                : "Using attendance pulled from Supabase."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              BGN display uses the fixed rate {formatExchangeRateLabel()}.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Total payroll
            </p>
            <div className="mt-2">
              <MoneyDisplay amount={summary.totalPayroll} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Staff paid
            </p>
            <p className="mt-2 text-xl font-semibold">{summary.employeeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Pay units
            </p>
            <p className="mt-2 text-xl font-semibold">{summary.totalUnits.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Overrides
            </p>
            <p className="mt-2 text-xl font-semibold">{summary.overrideDays}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll rows</CardTitle>
          <CardDescription>
            Amount = pay override when present, otherwise daily rate x pay units.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {payrollRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No attendance is available in this month/period yet.
            </div>
          ) : null}
          {payrollRows.map((row) => (
            <div
              key={row.employee.id}
              className="rounded-3xl border border-border/70 bg-secondary/25 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{row.employee.fullName}</p>
                  <p className="text-sm text-muted-foreground">{row.employee.role}</p>
                </div>
                {row.overrideCount > 0 ? (
                  <Badge variant="warning">{row.overrideCount} override day(s)</Badge>
                ) : (
                  <Badge variant="outline">Standard formula</Badge>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-2xl bg-card px-3 py-2">
                  <p className="text-muted-foreground">Shifts</p>
                  <p className="mt-1 font-semibold">{row.shiftsWorked}</p>
                </div>
                <div className="rounded-2xl bg-card px-3 py-2">
                  <p className="text-muted-foreground">Units</p>
                  <p className="mt-1 font-semibold">{row.totalUnits.toFixed(1)}</p>
                </div>
                <div className="rounded-2xl bg-card px-3 py-2">
                  <p className="text-muted-foreground">Amount</p>
                  <div className="mt-1">
                    <MoneyDisplay amount={row.totalAmount} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

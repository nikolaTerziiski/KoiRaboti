"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MoneyDisplay } from "@/components/ui/money-display";
import { SelectField } from "@/components/ui/select-field";
import {
  formatDateLabel,
  formatExchangeRateLabel,
  formatMonthLabel,
} from "@/lib/format";
import type { DailyReportWithAttendance, SnapshotMode } from "@/lib/types";

type ReportsPageClientProps = {
  reports: DailyReportWithAttendance[];
  dataMode: SnapshotMode;
};

export function ReportsPageClient({
  reports,
  dataMode,
}: ReportsPageClientProps) {
  const months = Array.from(
    new Set(reports.map((report) => `${report.workDate.slice(0, 7)}-01`)),
  );
  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? "");
  const visibleReports = reports.filter((report) =>
    selectedMonth ? report.workDate.startsWith(selectedMonth.slice(0, 7)) : true,
  );

  const totals = visibleReports.reduce(
    (summary, report) => ({
      turnover: summary.turnover + report.turnover,
      profit: summary.profit + report.profit,
      cardAmount: summary.cardAmount + report.cardAmount,
      manualExpense: summary.manualExpense + report.manualExpense,
    }),
    {
      turnover: 0,
      profit: 0,
      cardAmount: 0,
      manualExpense: 0,
    },
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Report history</CardTitle>
          <CardDescription>
            Daily sales and profit snapshots for review and payroll context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="monthSelect">
              Month
            </label>
            <SelectField
              id="monthSelect"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-secondary/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Turnover
              </p>
              <div className="mt-2">
                <MoneyDisplay amount={totals.turnover} compact />
              </div>
            </div>
            <div className="rounded-2xl bg-secondary/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Profit
              </p>
              <div className="mt-2">
                <MoneyDisplay amount={totals.profit} compact />
              </div>
            </div>
            <div className="rounded-2xl bg-secondary/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Card
              </p>
              <div className="mt-2">
                <MoneyDisplay amount={totals.cardAmount} compact />
              </div>
            </div>
            <div className="rounded-2xl bg-secondary/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Manual
              </p>
              <div className="mt-2">
                <MoneyDisplay amount={totals.manualExpense} compact />
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {dataMode === "demo"
              ? "These are seeded reports so the app is usable before live data exists."
              : "These reports are coming from Supabase."}
          </p>
          <p className="text-sm text-muted-foreground">
            BGN equivalents are shown using the fixed rate {formatExchangeRateLabel()}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily entries</CardTitle>
          <CardDescription>
            Review finance metrics and attendance count for each work date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleReports.map((report) => {
            const cardShare =
              report.turnover === 0 ? 0 : (report.cardAmount / report.turnover) * 100;
            const profitMargin =
              report.turnover === 0 ? 0 : (report.profit / report.turnover) * 100;

            return (
              <div
                key={report.id}
                className="rounded-3xl border border-border/70 bg-secondary/25 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{formatDateLabel(report.workDate)}</p>
                    <p className="text-sm text-muted-foreground">
                      {report.attendanceEntries.length} attendance entries
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-3 py-2">
                    <MoneyDisplay amount={report.turnover} align="end" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div className="rounded-2xl bg-card px-3 py-2">
                    <p className="text-muted-foreground">Profit</p>
                    <div className="mt-1">
                      <MoneyDisplay amount={report.profit} />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-card px-3 py-2">
                    <p className="text-muted-foreground">Card</p>
                    <div className="mt-1">
                      <MoneyDisplay amount={report.cardAmount} />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-card px-3 py-2">
                    <p className="text-muted-foreground">Expense</p>
                    <div className="mt-1">
                      <MoneyDisplay amount={report.manualExpense} />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-card px-3 py-2">
                    <p className="text-muted-foreground">Margin</p>
                    <p className="mt-1 font-semibold">{profitMargin.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>Card share</span>
                      <span>{cardShare.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-card">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.min(cardShare, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>Profit margin</span>
                      <span>{profitMargin.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-card">
                      <div
                        className="h-2 rounded-full bg-success"
                        style={{ width: `${Math.min(profitMargin, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

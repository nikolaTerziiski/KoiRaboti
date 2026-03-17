"use client";

import { useState } from "react";
import { Calculator, CircleDollarSign, RotateCcw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { formatCurrency, formatDateLabel } from "@/lib/format";
import { resolveAttendanceAmount } from "@/lib/payroll";
import type { DailyReportWithAttendance, Employee, PayUnits, SnapshotMode } from "@/lib/types";

type AttendanceDraft = {
  employee: Employee;
  shift1: boolean;
  shift2: boolean;
  payUnits: PayUnits;
  payOverride: string;
};

type TodayDashboardProps = {
  employees: Employee[];
  initialReport: DailyReportWithAttendance;
  dataMode: SnapshotMode;
};

function toNumber(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function TodayDashboard({
  employees,
  initialReport,
  dataMode,
}: TodayDashboardProps) {
  const [reportForm, setReportForm] = useState({
    turnover: String(initialReport.turnover),
    profit: String(initialReport.profit),
    cardAmount: String(initialReport.cardAmount),
    manualExpense: String(initialReport.manualExpense),
  });
  const [attendanceDrafts, setAttendanceDrafts] = useState<AttendanceDraft[]>(
    employees
      .filter((employee) => employee.isActive)
      .map((employee) => {
        const entry = initialReport.attendanceEntries.find(
          (attendance) => attendance.employeeId === employee.id,
        );

        return {
          employee,
          shift1: entry?.shift1 ?? false,
          shift2: entry?.shift2 ?? false,
          payUnits: entry?.payUnits ?? 1,
          payOverride: entry?.payOverride?.toString() ?? "",
        };
      }),
  );

  const checkedInCount = attendanceDrafts.filter(
    (entry) => entry.shift1 || entry.shift2,
  ).length;
  const totalPayUnits = attendanceDrafts.reduce(
    (sum, entry) => sum + (entry.shift1 || entry.shift2 ? entry.payUnits : 0),
    0,
  );
  const estimatedPayroll = attendanceDrafts.reduce((sum, entry) => {
    if (!entry.shift1 && !entry.shift2) {
      return sum;
    }

    return (
      sum +
      resolveAttendanceAmount(entry.employee, {
        id: `draft-${entry.employee.id}`,
        dailyReportId: initialReport.id,
        employeeId: entry.employee.id,
        shift1: entry.shift1,
        shift2: entry.shift2,
        payUnits: entry.payUnits,
        payOverride: entry.payOverride ? toNumber(entry.payOverride) : null,
      })
    );
  }, 0);

  const summaryCards = [
    {
      label: "Turnover",
      value: formatCurrency(toNumber(reportForm.turnover)),
      icon: CircleDollarSign,
    },
    {
      label: "Profit",
      value: formatCurrency(toNumber(reportForm.profit)),
      icon: Calculator,
    },
    {
      label: "Checked in",
      value: `${checkedInCount} team`,
      icon: Users,
    },
    {
      label: "Payroll",
      value: formatCurrency(estimatedPayroll),
      icon: CircleDollarSign,
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary to-[#176b38] text-primary-foreground">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Today&apos;s shift sheet</CardTitle>
              <CardDescription className="mt-1 text-primary-foreground/80">
                {formatDateLabel(initialReport.workDate)}
              </CardDescription>
            </div>
            <Badge className="bg-white/14 text-white" variant="default">
              {dataMode === "demo" ? "Demo dataset" : "Supabase snapshot"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-primary-foreground/85">
          <p>Fast daily input for finance and attendance, with payroll units visible while you record the shift.</p>
          <p>The current MVP preview keeps edits in-memory so the app stays runnable before a live Supabase project is attached.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold">{card.value}</p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                    <Icon className="size-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily report</CardTitle>
          <CardDescription>
            Manual expense starts at 800 and can be adjusted only when needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="turnover">Turnover</Label>
            <Input
              id="turnover"
              inputMode="decimal"
              value={reportForm.turnover}
              onChange={(event) =>
                setReportForm((current) => ({
                  ...current,
                  turnover: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profit">Profit</Label>
            <Input
              id="profit"
              inputMode="decimal"
              value={reportForm.profit}
              onChange={(event) =>
                setReportForm((current) => ({
                  ...current,
                  profit: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardAmount">Card amount</Label>
            <Input
              id="cardAmount"
              inputMode="decimal"
              value={reportForm.cardAmount}
              onChange={(event) =>
                setReportForm((current) => ({
                  ...current,
                  cardAmount: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manualExpense">Manual expense</Label>
            <Input
              id="manualExpense"
              inputMode="decimal"
              value={reportForm.manualExpense}
              onChange={(event) =>
                setReportForm((current) => ({
                  ...current,
                  manualExpense: event.target.value,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>
              Track two shifts, then confirm payroll units as 1, 1.5, or 2.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setAttendanceDrafts((current) =>
                current.map((entry) => ({
                  ...entry,
                  shift1: false,
                  shift2: false,
                  payUnits: 1,
                  payOverride: "",
                })),
              )
            }
          >
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {attendanceDrafts.map((entry) => {
            const payout =
              entry.shift1 || entry.shift2
                ? resolveAttendanceAmount(entry.employee, {
                    id: `draft-${entry.employee.id}`,
                    dailyReportId: initialReport.id,
                    employeeId: entry.employee.id,
                    shift1: entry.shift1,
                    shift2: entry.shift2,
                    payUnits: entry.payUnits,
                    payOverride: entry.payOverride ? toNumber(entry.payOverride) : null,
                  })
                : 0;

            return (
              <div
                key={entry.employee.id}
                className="rounded-3xl border border-border/70 bg-secondary/25 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{entry.employee.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.employee.role} · {formatCurrency(entry.employee.dailyRate)} daily rate
                    </p>
                  </div>
                  <Badge variant={entry.shift1 || entry.shift2 ? "success" : "outline"}>
                    {entry.shift1 || entry.shift2 ? "Working" : "Off"}
                  </Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={entry.shift1 ? "default" : "outline"}
                    className="flex-1"
                    onClick={() =>
                      setAttendanceDrafts((current) =>
                        current.map((item) =>
                          item.employee.id === entry.employee.id
                            ? { ...item, shift1: !item.shift1 }
                            : item,
                        ),
                      )
                    }
                  >
                    Shift 1
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={entry.shift2 ? "default" : "outline"}
                    className="flex-1"
                    onClick={() =>
                      setAttendanceDrafts((current) =>
                        current.map((item) =>
                          item.employee.id === entry.employee.id
                            ? { ...item, shift2: !item.shift2 }
                            : item,
                        ),
                      )
                    }
                  >
                    Shift 2
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`payUnits-${entry.employee.id}`}>Pay units</Label>
                    <SelectField
                      id={`payUnits-${entry.employee.id}`}
                      value={String(entry.payUnits)}
                      onChange={(event) =>
                        setAttendanceDrafts((current) =>
                          current.map((item) =>
                            item.employee.id === entry.employee.id
                              ? {
                                  ...item,
                                  payUnits: Number(event.target.value) as PayUnits,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="1">1</option>
                      <option value="1.5">1.5</option>
                      <option value="2">2</option>
                    </SelectField>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`override-${entry.employee.id}`}>Pay override</Label>
                    <Input
                      id={`override-${entry.employee.id}`}
                      inputMode="decimal"
                      placeholder="Optional"
                      value={entry.payOverride}
                      onChange={(event) =>
                        setAttendanceDrafts((current) =>
                          current.map((item) =>
                            item.employee.id === entry.employee.id
                              ? { ...item, payOverride: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-card px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    Units: {entry.payUnits} · Marked shifts: {Number(entry.shift1) + Number(entry.shift2)}
                  </span>
                  <span className="font-semibold">{formatCurrency(payout)}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick totals</CardTitle>
          <CardDescription>
            Use this summary before locking in payroll for the day.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-secondary/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Card share
            </p>
            <p className="mt-2 text-xl font-semibold">
              {formatCurrency(toNumber(reportForm.cardAmount))}
            </p>
          </div>
          <div className="rounded-2xl bg-secondary/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Pay units
            </p>
            <p className="mt-2 text-xl font-semibold">{totalPayUnits.toFixed(1)}</p>
          </div>
          <div className="rounded-2xl bg-secondary/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Manual expense
            </p>
            <p className="mt-2 text-xl font-semibold">
              {formatCurrency(toNumber(reportForm.manualExpense))}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

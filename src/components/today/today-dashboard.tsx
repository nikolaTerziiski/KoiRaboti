"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, CircleDollarSign, RotateCcw, Save, Users } from "lucide-react";
import {
  initialTodayActionState,
  saveTodayReportAction,
} from "@/actions/today";
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
import { Label } from "@/components/ui/label";
import { MoneyDisplay } from "@/components/ui/money-display";
import { SelectField } from "@/components/ui/select-field";
import {
  DEFAULT_MANUAL_EXPENSE_EUR,
  formatBgnCurrencyFromEur,
  formatDateLabel,
  formatExchangeRateLabel,
} from "@/lib/format";
import { resolveAttendanceAmount } from "@/lib/payroll";
import type {
  DailyReportWithAttendance,
  Employee,
  PayUnits,
  SnapshotMode,
} from "@/lib/types";

type AttendanceDraft = {
  employee: Employee;
  shift1: boolean;
  shift2: boolean;
  payUnits: PayUnits;
  payOverride: string;
  notes: string;
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

function buildAttendanceDrafts(
  employees: Employee[],
  initialReport: DailyReportWithAttendance,
) {
  return employees
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
        notes: entry?.notes ?? "",
      };
    });
}

export function TodayDashboard({
  employees,
  initialReport,
  dataMode,
}: TodayDashboardProps) {
  const router = useRouter();
  const [actionState, formAction, isPending] = useActionState(
    saveTodayReportAction,
    initialTodayActionState,
  );
  const refreshedKeyRef = useRef<string | null>(null);
  const [reportForm, setReportForm] = useState({
    turnover: String(initialReport.turnover),
    profit: String(initialReport.profit),
    cardAmount: String(initialReport.cardAmount),
    manualExpense: String(initialReport.manualExpense),
    notes: initialReport.notes ?? "",
  });
  const [attendanceDrafts, setAttendanceDrafts] = useState<AttendanceDraft[]>(
    buildAttendanceDrafts(employees, initialReport),
  );

  useEffect(() => {
    if (
      actionState.status === "success" &&
      actionState.refreshKey &&
      refreshedKeyRef.current !== actionState.refreshKey
    ) {
      refreshedKeyRef.current = actionState.refreshKey;
      router.refresh();
    }
  }, [actionState, router]);

  const checkedInCount = attendanceDrafts.filter(
    (entry) =>
      entry.shift1 ||
      entry.shift2 ||
      entry.payOverride.trim().length > 0 ||
      entry.notes.trim().length > 0,
  ).length;
  const totalPayUnits = attendanceDrafts.reduce(
    (sum, entry) =>
      sum +
      (entry.shift1 ||
      entry.shift2 ||
      entry.payOverride.trim().length > 0 ||
      entry.notes.trim().length > 0
        ? entry.payUnits
        : 0),
    0,
  );
  const estimatedPayroll = attendanceDrafts.reduce((sum, entry) => {
    if (
      !entry.shift1 &&
      !entry.shift2 &&
      entry.payOverride.trim().length === 0 &&
      entry.notes.trim().length === 0
    ) {
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
        notes: entry.notes || null,
      })
    );
  }, 0);

  const summaryCards = [
    {
      label: "Turnover",
      amount: toNumber(reportForm.turnover),
      icon: CircleDollarSign,
    },
    {
      label: "Profit",
      amount: toNumber(reportForm.profit),
      icon: Calculator,
    },
    {
      label: "Checked in",
      value: `${checkedInCount} team`,
      helper: `${totalPayUnits.toFixed(1)} pay units`,
      icon: Users,
    },
    {
      label: "Payroll",
      amount: estimatedPayroll,
      icon: CircleDollarSign,
    },
  ];

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workDate" value={initialReport.workDate} />
      <input
        type="hidden"
        name="attendancePayload"
        value={JSON.stringify(
          attendanceDrafts.map((entry) => ({
            employeeId: entry.employee.id,
            shift1: entry.shift1,
            shift2: entry.shift2,
            payUnits: entry.payUnits,
            payOverride: entry.payOverride,
            notes: entry.notes,
          })),
        )}
      />

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
          <p>
            Fast daily input for finance and attendance, with payroll units visible while
            you record the shift.
          </p>
          <p>
            Working currency is EUR, and every amount is shown with its BGN equivalent
            at {formatExchangeRateLabel()}.
          </p>
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
                    <div className="mt-2">
                      {card.amount === undefined ? (
                        <>
                          <p className="text-lg font-semibold">{card.value}</p>
                          <p className="text-xs text-muted-foreground">{card.helper}</p>
                        </>
                      ) : (
                        <MoneyDisplay amount={card.amount} />
                      )}
                    </div>
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
            Manual expense starts from the EUR equivalent of 800 BGN and can be adjusted
            only when needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="turnover">Turnover (EUR)</Label>
            <Input
              id="turnover"
              name="turnover"
              inputMode="decimal"
              value={reportForm.turnover}
              onChange={(event) =>
                setReportForm((current) => ({
                  ...current,
                  turnover: event.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              BGN view: {formatBgnCurrencyFromEur(toNumber(reportForm.turnover))}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profit">Profit (EUR)</Label>
            <Input
              id="profit"
              name="profit"
              inputMode="decimal"
              value={reportForm.profit}
              onChange={(event) =>
                setReportForm((current) => ({
                  ...current,
                  profit: event.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              BGN view: {formatBgnCurrencyFromEur(toNumber(reportForm.profit))}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardAmount">Card amount (EUR)</Label>
            <Input
              id="cardAmount"
              name="cardAmount"
              inputMode="decimal"
              value={reportForm.cardAmount}
              onChange={(event) =>
                setReportForm((current) => ({
                  ...current,
                  cardAmount: event.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              BGN view: {formatBgnCurrencyFromEur(toNumber(reportForm.cardAmount))}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manualExpense">Manual expense (EUR)</Label>
            <Input
              id="manualExpense"
              name="manualExpense"
              inputMode="decimal"
              value={reportForm.manualExpense}
              onChange={(event) =>
                setReportForm((current) => ({
                  ...current,
                  manualExpense: event.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              BGN view: {formatBgnCurrencyFromEur(toNumber(reportForm.manualExpense))}
            </p>
            <p className="text-xs text-muted-foreground">
              Default: {formatBgnCurrencyFromEur(DEFAULT_MANUAL_EXPENSE_EUR)}
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reportNotes">Manager notes</Label>
            <textarea
              id="reportNotes"
              name="reportNotes"
              value={reportForm.notes}
              onChange={(event) =>
                setReportForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              className="min-h-24 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Optional notes for the day"
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
                  notes: "",
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
              entry.shift1 || entry.shift2 || entry.payOverride.trim() || entry.notes.trim()
                ? resolveAttendanceAmount(entry.employee, {
                    id: `draft-${entry.employee.id}`,
                    dailyReportId: initialReport.id,
                    employeeId: entry.employee.id,
                    shift1: entry.shift1,
                    shift2: entry.shift2,
                    payUnits: entry.payUnits,
                    payOverride: entry.payOverride ? toNumber(entry.payOverride) : null,
                    notes: entry.notes || null,
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
                    <p className="text-sm text-muted-foreground">{entry.employee.role}</p>
                    <div className="mt-2">
                      <MoneyDisplay amount={entry.employee.dailyRate} />
                    </div>
                  </div>
                  <Badge
                    variant={
                      entry.shift1 ||
                      entry.shift2 ||
                      entry.payOverride.trim().length > 0 ||
                      entry.notes.trim().length > 0
                        ? "success"
                        : "outline"
                    }
                  >
                    {entry.shift1 ||
                    entry.shift2 ||
                    entry.payOverride.trim().length > 0 ||
                    entry.notes.trim().length > 0
                      ? "Selected"
                      : "Off"}
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
                    <Label htmlFor={`override-${entry.employee.id}`}>Pay override (EUR)</Label>
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
                    <p className="text-xs text-muted-foreground">
                      BGN view: {formatBgnCurrencyFromEur(toNumber(entry.payOverride))}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor={`notes-${entry.employee.id}`}>Shift notes</Label>
                  <Input
                    id={`notes-${entry.employee.id}`}
                    value={entry.notes}
                    placeholder="Optional employee note"
                    onChange={(event) =>
                      setAttendanceDrafts((current) =>
                        current.map((item) =>
                          item.employee.id === entry.employee.id
                            ? { ...item, notes: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-card px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    Units: {entry.payUnits} | Marked shifts: {Number(entry.shift1) + Number(entry.shift2)}
                  </span>
                  <MoneyDisplay amount={payout} align="end" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Save</CardTitle>
          <CardDescription>
            Save the report and attendance to Supabase, then refresh the operational pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionState.status !== "idle" ? (
            <div
              className={
                actionState.status === "success"
                  ? "rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"
                  : "rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              }
            >
              {actionState.message}
            </div>
          ) : null}
          {dataMode === "demo" ? (
            <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
              Demo mode stays interactive, but saving is disabled until Supabase env vars are configured.
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-secondary/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Card share
              </p>
              <div className="mt-2">
                <MoneyDisplay amount={toNumber(reportForm.cardAmount)} />
              </div>
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
              <div className="mt-2">
                <MoneyDisplay amount={toNumber(reportForm.manualExpense)} />
              </div>
            </div>
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isPending || dataMode === "demo"}
            aria-busy={isPending}
          >
            <Save className="size-4" />
            {isPending ? "Saving to Supabase..." : "Save today"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

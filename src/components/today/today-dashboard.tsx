"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, CircleDollarSign, Save, Users } from "lucide-react";
import type { TodayActionState } from "@/actions/today";
import { saveTodayReportAction } from "@/actions/today";
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
import { useLocale } from "@/lib/i18n/context";
import {
  DEFAULT_MANUAL_EXPENSE_EUR,
  formatBgnCurrencyFromEur,
  formatDateLabel,
  formatExchangeRateLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  DailyReportWithAttendance,
  Employee,
  PayUnits,
  SnapshotMode,
} from "@/lib/types";

const initialTodayActionState: TodayActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  refreshKey: null,
};

type AttendanceDraft = {
  employee: Employee;
  isPresent: boolean;
  payUnits: PayUnits;
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
        isPresent: Boolean(entry),
        payUnits: entry?.payUnits ?? 1,
      };
    });
}

export function TodayDashboard({
  employees,
  initialReport,
  dataMode,
}: TodayDashboardProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const refreshedKeyRef = useRef<string | null>(null);
  const [actionState, formAction, isPending] = useActionState(
    saveTodayReportAction,
    initialTodayActionState,
  );
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

  const labels = useMemo(
    () => ({
      dailyRate: locale === "bg" ? "Дневна ставка" : "Daily rate",
      shiftsCount: locale === "bg" ? "Брой смени" : "Number of shifts",
      tapHint:
        locale === "bg"
          ? "Докосни картата, за да отбележиш служителя като присъстващ."
          : "Tap the card to mark the employee as at work.",
      activeHint:
        locale === "bg"
          ? "Картата е зелена, когато служителят е на работа."
          : "The card turns green when the employee is at work.",
      atWork: locale === "bg" ? "На работа" : "At work",
      notSelected: locale === "bg" ? "Не е избран" : "Not selected",
      employeesCount: locale === "bg" ? "служители" : "employees",
      saveSummary: locale === "bg" ? "Брой смени" : "Number of shifts",
    }),
    [locale],
  );

  const checkedInCount = attendanceDrafts.filter((entry) => entry.isPresent).length;
  const totalPayUnits = attendanceDrafts.reduce(
    (sum, entry) => sum + (entry.isPresent ? entry.payUnits : 0),
    0,
  );
  const estimatedPayroll = attendanceDrafts.reduce(
    (sum, entry) =>
      sum + (entry.isPresent ? entry.employee.dailyRate * entry.payUnits : 0),
    0,
  );

  const summaryCards = [
    {
      label: t.today.turnover,
      amount: toNumber(reportForm.turnover),
      icon: CircleDollarSign,
    },
    {
      label: t.today.profit,
      amount: toNumber(reportForm.profit),
      icon: Calculator,
    },
    {
      label: t.today.checkedIn,
      value: `${checkedInCount} ${labels.employeesCount}`,
      helper: `${totalPayUnits.toFixed(1)} ${labels.shiftsCount.toLowerCase()}`,
      icon: Users,
    },
    {
      label: t.today.payroll,
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
            isPresent: entry.isPresent,
            payUnits: entry.payUnits,
          })),
        )}
      />

      <Card className="bg-gradient-to-br from-primary to-[#176b38] text-primary-foreground">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{t.today.shiftSheet}</CardTitle>
              <CardDescription className="mt-1 text-primary-foreground/80">
                {formatDateLabel(initialReport.workDate, locale)}
              </CardDescription>
            </div>
            <Badge className="bg-white/14 text-white" variant="default">
              {dataMode === "demo" ? t.today.demoDataset : t.today.supabaseSnapshot}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-primary-foreground/85">
          <p>{labels.tapHint}</p>
          <p>
            {labels.activeHint} {formatExchangeRateLabel()}.
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
          <CardTitle>{t.today.dailyReport}</CardTitle>
          <CardDescription>{t.today.dailyReportDesc}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="turnover">{t.today.turnoverEur}</Label>
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
              {t.today.bgnView} {formatBgnCurrencyFromEur(toNumber(reportForm.turnover))}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profit">{t.today.profitEur}</Label>
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
              {t.today.bgnView} {formatBgnCurrencyFromEur(toNumber(reportForm.profit))}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardAmount">{t.today.cardAmountEur}</Label>
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
              {t.today.bgnView} {formatBgnCurrencyFromEur(toNumber(reportForm.cardAmount))}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manualExpense">{t.today.manualExpenseEur}</Label>
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
              {t.today.bgnView}{" "}
              {formatBgnCurrencyFromEur(toNumber(reportForm.manualExpense))}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.today.default} {formatBgnCurrencyFromEur(DEFAULT_MANUAL_EXPENSE_EUR)}
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reportNotes">{t.today.managerNotes}</Label>
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
              placeholder={t.today.notesPlaceholder}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.today.attendance}</CardTitle>
          <CardDescription>{labels.tapHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {attendanceDrafts.map((entry) => {
            const payout = entry.isPresent ? entry.employee.dailyRate * entry.payUnits : 0;

            return (
              <div
                key={entry.employee.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  setAttendanceDrafts((current) =>
                    current.map((item) =>
                      item.employee.id === entry.employee.id
                        ? {
                            ...item,
                            isPresent: !item.isPresent,
                            payUnits: item.isPresent ? 1 : item.payUnits,
                          }
                        : item,
                    ),
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setAttendanceDrafts((current) =>
                      current.map((item) =>
                        item.employee.id === entry.employee.id
                          ? {
                              ...item,
                              isPresent: !item.isPresent,
                              payUnits: item.isPresent ? 1 : item.payUnits,
                            }
                          : item,
                      ),
                    );
                  }
                }}
                className={cn(
                  "rounded-3xl border p-4 transition-colors",
                  entry.isPresent
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : "border-border/70 bg-secondary/25",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{entry.employee.fullName}</p>
                    <p
                      className={cn(
                        "mt-1 text-sm",
                        entry.isPresent
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground",
                      )}
                    >
                      {labels.dailyRate}
                    </p>
                    <div className="mt-2">
                      <MoneyDisplay
                        amount={entry.employee.dailyRate}
                        secondaryClassName={
                          entry.isPresent ? "text-primary-foreground/70" : undefined
                        }
                      />
                    </div>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      entry.isPresent
                        ? "text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {entry.isPresent ? labels.atWork : labels.notSelected}
                  </p>
                </div>

                {entry.isPresent ? (
                  <div
                    className="mt-4 rounded-2xl bg-white/14 p-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div className="space-y-2">
                        <Label
                          htmlFor={`payUnits-${entry.employee.id}`}
                          className="text-primary-foreground"
                        >
                          {labels.shiftsCount}
                        </Label>
                        <SelectField
                          id={`payUnits-${entry.employee.id}`}
                          value={String(entry.payUnits)}
                          className="border-white/20 bg-white text-foreground"
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
                      <div className="rounded-2xl bg-white px-3 py-2 text-right text-foreground">
                        <MoneyDisplay amount={payout} align="end" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.today.save}</CardTitle>
          <CardDescription>{t.today.saveDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionState.status !== "idle" ? (
            <div
              className={cn(
                "rounded-2xl px-4 py-3 text-sm",
                actionState.status === "success"
                  ? "border border-success/20 bg-success/10 text-success"
                  : "border border-destructive/20 bg-destructive/10 text-destructive",
              )}
            >
              {actionState.messageKey ? t.today[actionState.messageKey] : actionState.message}
            </div>
          ) : null}
          {dataMode === "demo" ? (
            <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
              {t.today.demoSaveNote}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-secondary/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {t.today.cardShare}
              </p>
              <div className="mt-2">
                <MoneyDisplay amount={toNumber(reportForm.cardAmount)} />
              </div>
            </div>
            <div className="rounded-2xl bg-secondary/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {labels.saveSummary}
              </p>
              <p className="mt-2 text-xl font-semibold">{totalPayUnits.toFixed(1)}</p>
            </div>
            <div className="rounded-2xl bg-secondary/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {t.today.manualExpense}
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
            {isPending ? t.today.savingSupabase : t.today.saveToday}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

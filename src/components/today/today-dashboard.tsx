"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  EmployeeRole,
  PayUnits,
  SnapshotMode,
} from "@/lib/types";

const initialTodayActionState: TodayActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  refreshKey: null,
};

const ROLE_ORDER: EmployeeRole[] = ["kitchen", "service"];

type AttendanceDraft = {
  employee: Employee;
  isPresent: boolean;
  payUnits: PayUnits;
  dailyRate: number;
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
        dailyRate: entry?.dailyRate ?? employee.dailyRate,
      };
    });
}

export function TodayDashboard({ employees, initialReport, dataMode }: TodayDashboardProps) {
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

  const checkedInCount = attendanceDrafts.filter((entry) => entry.isPresent).length;
  const totalPayUnits = attendanceDrafts.reduce(
    (sum, entry) => sum + (entry.isPresent ? entry.payUnits : 0),
    0,
  );
  const estimatedPayroll = attendanceDrafts.reduce(
    (sum, entry) => sum + (entry.isPresent ? entry.dailyRate * entry.payUnits : 0),
    0,
  );

  const roleSections = ROLE_ORDER.map((role) => {
    const entries = attendanceDrafts.filter((entry) => entry.employee.role === role);
    const sectionClass =
      role === "kitchen"
        ? "border-purple-200 bg-purple-50"
        : "border-green-200 bg-green-50";
    const activeClass =
      role === "kitchen"
        ? "border-purple-300 bg-purple-600 text-white shadow-md"
        : "border-green-300 bg-green-600 text-white shadow-md";
    const badgeClass =
      role === "kitchen"
        ? "border-purple-200 bg-purple-100 text-purple-700"
        : "border-green-200 bg-green-100 text-green-700";

    return {
      role,
      title: role === "kitchen" ? t.common.kitchen : t.common.service,
      entries,
      sectionClass,
      activeClass,
      badgeClass,
    };
  });

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
      value: `${checkedInCount} ${t.today.employeesCount}`,
      helper: `${totalPayUnits.toFixed(1)} ${t.payroll.shiftsCount.toLowerCase()}`,
      icon: Users,
    },
    {
      label: t.today.payroll,
      amount: estimatedPayroll,
      icon: CircleDollarSign,
    },
  ];

  function toggleAttendance(employeeId: string) {
    setAttendanceDrafts((current) =>
      current.map((item) =>
        item.employee.id === employeeId
          ? {
              ...item,
              isPresent: !item.isPresent,
              payUnits: item.isPresent ? 1 : item.payUnits,
            }
          : item,
      ),
    );
  }

  function updatePayUnits(employeeId: string, payUnits: PayUnits) {
    setAttendanceDrafts((current) =>
      current.map((item) =>
        item.employee.id === employeeId ? { ...item, payUnits } : item,
      ),
    );
  }

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

      <Card className="bg-gradient-to-br from-primary to-green-800 text-primary-foreground">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{t.today.shiftSheet}</CardTitle>
              <CardDescription className="mt-1 text-primary-foreground/80">
                {formatDateLabel(initialReport.workDate, locale)}
              </CardDescription>
            </div>
            {dataMode === "demo" ? (
              <Badge className="bg-white/15 text-white" variant="default">
                {t.today.demoDataset}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-primary-foreground/80">
          <p>{t.today.roleHint}</p>
          <p>
            {t.today.currency} {formatExchangeRateLabel()}.
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                  <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
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
              min="0"
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
              min="0"
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
              min="0"
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
              min="0"
              value={reportForm.manualExpense}
              onChange={(event) =>
                setReportForm((current) => ({
                  ...current,
                  manualExpense: event.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              {t.today.bgnView} {formatBgnCurrencyFromEur(toNumber(reportForm.manualExpense))}
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
              className="min-h-24 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={t.today.notesPlaceholder}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.today.attendance}</CardTitle>
          <CardDescription>{t.today.attendanceDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            {t.today.roleHint}
          </div>
          <div className="space-y-4">
            {roleSections.map((section) => (
              <div key={section.role} className={cn("rounded-2xl border p-4", section.sectionClass)}>
                <div className="flex items-center justify-between gap-3 pb-3">
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                  <Badge className={section.badgeClass} variant="outline">
                    {section.entries.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {section.entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.today.noEmployeesInRole}</p>
                  ) : null}
                  {section.entries.map((entry) => (
                    <div
                      key={entry.employee.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleAttendance(entry.employee.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleAttendance(entry.employee.id);
                        }
                      }}
                      className={cn(
                        "rounded-xl border p-4 transition-colors",
                        entry.isPresent ? section.activeClass : "border-border bg-muted",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={cn("font-semibold", entry.isPresent && "text-white")}>
                            {entry.employee.fullName}
                          </p>
                          <p
                            className={cn(
                              "mt-1 text-sm",
                              entry.isPresent ? "text-white/80" : "text-muted-foreground",
                            )}
                          >
                            {entry.isPresent ? t.today.atWork : t.today.notSelected}
                          </p>
                        </div>
                      </div>

                      {entry.isPresent ? (
                        <div
                          className="mt-4"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Label
                            htmlFor={`payUnits-${entry.employee.id}`}
                            className={cn("text-sm", "text-white/80")}
                          >
                            {t.payroll.shiftsCount}
                          </Label>
                          <SelectField
                            id={`payUnits-${entry.employee.id}`}
                            value={String(entry.payUnits)}
                            className="mt-1 border-white/20 bg-white text-foreground"
                            onChange={(event) =>
                              updatePayUnits(
                                entry.employee.id,
                                Number(event.target.value) as PayUnits,
                              )
                            }
                          >
                            <option value="1">1</option>
                            <option value="1.5">1.5</option>
                            <option value="2">2</option>
                          </SelectField>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">{t.today.tapHint}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
              {actionState.messageKey === "msgSaveSuccess"
                ? t.today.msgSaveSuccess
                : actionState.messageKey === "msgSaveError"
                  ? t.today.msgSaveError
                  : actionState.message}
            </div>
          ) : null}
          {dataMode === "demo" ? (
            <div className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              {t.today.demoSaveNote}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.today.cardShare}
              </p>
              <div className="mt-2">
                <MoneyDisplay amount={toNumber(reportForm.cardAmount)} />
              </div>
            </div>
            <div className="rounded-2xl bg-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.payroll.shiftsCount}
              </p>
              <p className="mt-2 text-xl font-semibold">{totalPayUnits.toFixed(1)}</p>
            </div>
            <div className="rounded-2xl bg-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
            {isPending ? t.common.saving : t.today.saveToday}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import type { ReportActionState } from "@/actions/reports";
import { saveReportCorrectionAction } from "@/actions/reports";
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
import { exportReportsToCSV } from "@/lib/csv-export";
import {
  formatDateLabel,
  formatExchangeRateLabel,
  formatMonthLabel,
} from "@/lib/format";
import type {
  DailyReportWithAttendance,
  Employee,
  PayUnits,
  SnapshotMode,
} from "@/lib/types";

const initialReportActionState: ReportActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  refreshKey: null,
};

type ReportsPageClientProps = {
  employees: Employee[];
  reports: DailyReportWithAttendance[];
  dataMode: SnapshotMode;
};

type AttendanceCorrectionDraft = {
  employeeId: string;
  employeeName: string;
  payUnits: PayUnits;
  payOverride: string;
};

type ReportCorrectionDraft = {
  reportId: string;
  workDate: string;
  turnover: string;
  profit: string;
  cardAmount: string;
  manualExpense: string;
  attendanceEntries: AttendanceCorrectionDraft[];
};

function buildCorrectionDraft(
  report: DailyReportWithAttendance,
  employees: Employee[],
): ReportCorrectionDraft {
  return {
    reportId: report.id,
    workDate: report.workDate,
    turnover: report.turnover.toString(),
    profit: report.profit.toString(),
    cardAmount: report.cardAmount.toString(),
    manualExpense: report.manualExpense.toString(),
    attendanceEntries: report.attendanceEntries.map((entry) => {
      const employee = employees.find((item) => item.id === entry.employeeId);

      return {
        employeeId: entry.employeeId,
        employeeName: employee?.fullName ?? entry.employeeId,
        payUnits: entry.payUnits,
        payOverride: entry.payOverride?.toString() ?? "",
      };
    }),
  };
}

export function ReportsPageClient({
  employees,
  reports,
  dataMode,
}: ReportsPageClientProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const refreshRef = useRef<string | null>(null);
  const [actionState, formAction, isPending] = useActionState(
    saveReportCorrectionAction,
    initialReportActionState,
  );
  const months = Array.from(
    new Set(reports.map((report) => `${report.workDate.slice(0, 7)}-01`)),
  );
  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? "");
  const [draft, setDraft] = useState<ReportCorrectionDraft | null>(null);

  useEffect(() => {
    if (
      actionState.status === "success" &&
      actionState.refreshKey &&
      refreshRef.current !== actionState.refreshKey
    ) {
      refreshRef.current = actionState.refreshKey;
      router.refresh();
    }
  }, [actionState, router]);

  const visibleReports = reports.filter((report) =>
    selectedMonth ? report.workDate.startsWith(selectedMonth.slice(0, 7)) : true,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.reports.history}</CardTitle>
          <CardDescription>{t.reports.historyDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="reports-month">{t.reports.month}</Label>
              <SelectField
                id="reports-month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthLabel(month, locale)}
                  </option>
                ))}
              </SelectField>
            </div>
            <Button
              type="button"
              variant="outline"
              className="sm:w-fit"
              disabled={visibleReports.length === 0}
              onClick={() => exportReportsToCSV(visibleReports, selectedMonth)}
            >
              <Download className="size-4" />
              {t.reports.exportCsv}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.reports.bgnRate} {formatExchangeRateLabel()}.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-3 font-medium">{t.reports.date}</th>
                  <th className="px-3 py-3 font-medium">{t.reports.turnover}</th>
                  <th className="px-3 py-3 font-medium">{t.reports.profit}</th>
                  <th className="px-3 py-3 font-medium">{t.reports.card}</th>
                  <th className="px-3 py-3 font-medium">{t.reports.expense}</th>
                  <th className="px-3 py-3 font-medium">{t.reports.netProfit}</th>
                  <th className="px-3 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {visibleReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      {t.reports.noReports}
                    </td>
                  </tr>
                ) : null}
                {visibleReports.map((report) => {
                  const netProfit = report.profit - report.manualExpense;
                  const isEditing = draft?.reportId === report.id;

                  return (
                    <tr key={report.id} className="border-t border-border align-top">
                      <td className="px-3 py-3 font-medium">
                        {formatDateLabel(report.workDate, locale)}
                      </td>
                      <td className="px-3 py-3">
                        <MoneyDisplay amount={report.turnover} compact />
                      </td>
                      <td className="px-3 py-3">
                        <MoneyDisplay amount={report.profit} compact />
                      </td>
                      <td className="px-3 py-3">
                        <MoneyDisplay amount={report.cardAmount} compact />
                      </td>
                      <td className="px-3 py-3">
                        <MoneyDisplay amount={report.manualExpense} compact />
                      </td>
                      <td className="px-3 py-3">
                        <MoneyDisplay amount={netProfit} compact />
                      </td>
                      <td className="px-3 py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant={isEditing ? "default" : "outline"}
                          onClick={() =>
                            setDraft((current) =>
                              current?.reportId === report.id
                                ? null
                                : buildCorrectionDraft(report, employees),
                            )
                          }
                        >
                          {isEditing ? t.reports.close : t.reports.edit}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {draft ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {t.reports.correctionTitle} {formatDateLabel(draft.workDate, locale)}
            </CardTitle>
            <CardDescription>{t.reports.correctionDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="reportId" value={draft.reportId} />
              <input
                type="hidden"
                name="attendancePayload"
                value={JSON.stringify(
                  draft.attendanceEntries.map((entry) => ({
                    employeeId: entry.employeeId,
                    payUnits: entry.payUnits,
                    payOverride: entry.payOverride,
                  })),
                )}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-turnover">{t.reports.turnover}</Label>
                  <Input
                    id="edit-turnover"
                    name="turnover"
                    inputMode="decimal"
                    value={draft.turnover}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, turnover: event.target.value } : current,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-profit">{t.reports.profit}</Label>
                  <Input
                    id="edit-profit"
                    name="profit"
                    inputMode="decimal"
                    value={draft.profit}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, profit: event.target.value } : current,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-card">{t.reports.card}</Label>
                  <Input
                    id="edit-card"
                    name="cardAmount"
                    inputMode="decimal"
                    value={draft.cardAmount}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, cardAmount: event.target.value } : current,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expense">{t.reports.expense}</Label>
                  <Input
                    id="edit-expense"
                    name="manualExpense"
                    inputMode="decimal"
                    value={draft.manualExpense}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, manualExpense: event.target.value }
                          : current,
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                {draft.attendanceEntries.map((entry) => (
                  <div
                    key={entry.employeeId}
                    className="rounded-2xl border border-border bg-muted p-3"
                  >
                    <p className="font-medium">{entry.employeeName}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`units-${entry.employeeId}`}>
                          {t.reports.shiftsCount}
                        </Label>
                        <SelectField
                          id={`units-${entry.employeeId}`}
                          value={String(entry.payUnits)}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    attendanceEntries: current.attendanceEntries.map((item) =>
                                      item.employeeId === entry.employeeId
                                        ? {
                                            ...item,
                                            payUnits: Number(
                                              event.target.value,
                                            ) as PayUnits,
                                          }
                                        : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                        >
                          <option value="1">1</option>
                          <option value="1.5">1.5</option>
                          <option value="2">2</option>
                        </SelectField>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`override-${entry.employeeId}`}>
                          {t.reports.payOverride}
                        </Label>
                        <Input
                          id={`override-${entry.employeeId}`}
                          inputMode="decimal"
                          value={entry.payOverride}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    attendanceEntries: current.attendanceEntries.map((item) =>
                                      item.employeeId === entry.employeeId
                                        ? { ...item, payOverride: event.target.value }
                                        : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {actionState.status !== "idle" ? (
                <div
                  className={
                    actionState.status === "success"
                      ? "rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"
                      : "rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  }
                >
                  {actionState.messageKey === "msgSaveSuccess"
                    ? t.reports.saveSuccess
                    : actionState.messageKey === "msgSaveError"
                      ? t.reports.saveError
                      : actionState.message}
                </div>
              ) : null}

              {dataMode === "demo" ? (
                <div className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                  {t.reports.demoNote}
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                disabled={isPending || dataMode === "demo"}
                aria-busy={isPending}
              >
                {isPending ? t.reports.saving : t.reports.save}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

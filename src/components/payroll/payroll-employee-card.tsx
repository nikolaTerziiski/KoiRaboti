"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { bg, enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { Banknote, CheckCheck, ChevronRight, Loader2 } from "lucide-react";
import type { PayrollPaymentActionState } from "@/actions/payments";
import {
  addPayrollAdvanceAction,
  togglePayrollPaymentAction,
} from "@/actions/payments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyDisplay } from "@/components/ui/money-display";
import { useLocale } from "@/lib/i18n/context";
import type { PayrollRow } from "@/lib/payroll";
import type { SnapshotMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const initialPaymentActionState: PayrollPaymentActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  refreshKey: null,
};

type PayrollEmployeeCardProps = {
  row: PayrollRow;
  dataMode: SnapshotMode;
};

function getDateLocale(locale: "bg" | "en") {
  return locale === "bg" ? bg : enUS;
}

function formatShortDate(value: string | Date, locale: "bg" | "en") {
  const date = value instanceof Date ? value : parseISO(value);
  return format(date, "d MMM", { locale: getDateLocale(locale) });
}

export function PayrollEmployeeCard({
  row,
  dataMode,
}: PayrollEmployeeCardProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const refreshRef = useRef<string | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceState, advanceFormAction, isAdvancing] = useActionState(
    addPayrollAdvanceAction,
    initialPaymentActionState,
  );
  const [paymentState, paymentFormAction, isPaying] = useActionState(
    togglePayrollPaymentAction,
    initialPaymentActionState,
  );
  const todayDateKey = new Date().toISOString().slice(0, 10);
  const canUndoLatestPayment =
    row.lastPaidAt === todayDateKey && row.netAmount <= 0.0001;
  const payDisabled =
    dataMode === "demo" || (!canUndoLatestPayment && row.netAmount <= 0.0001);
  const roleBadgeClass =
    row.employee.role === "kitchen"
      ? "border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
      : "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  const advanceFeedback =
    advanceState.status === "error"
      ? advanceState.message ?? t.payroll.advanceError
      : advanceState.status === "success"
        ? t.payroll.advanceSaved
        : null;
  const paymentFeedback =
    paymentState.status === "error"
      ? paymentState.message ?? t.payroll.paymentError
      : paymentState.status === "success"
        ? t.payroll.paymentSaved
        : null;

  useEffect(() => {
    const refreshKey =
      advanceState.status === "success"
        ? advanceState.refreshKey
        : paymentState.status === "success"
          ? paymentState.refreshKey
          : null;

    if (refreshKey && refreshRef.current !== refreshKey) {
      refreshRef.current = refreshKey;
      const timeoutId = window.setTimeout(() => {
        setAdvanceOpen(false);
        setConfirmOpen(false);
        setAdvanceAmount("");
        router.refresh();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [advanceState, paymentState, router]);

  return (
    <div className="rounded-[1.75rem] border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {row.employee.fullName}
              </p>
              <Badge className={roleBadgeClass} variant="outline">
                {row.employee.role === "kitchen" ? t.common.kitchen : t.common.service}
              </Badge>
            </div>
          </div>

          {row.isDue && row.netAmount > 0.0001 ? (
            <Badge variant="warning">{t.payroll.dueToday}</Badge>
          ) : (
            <Badge variant="outline">
              {t.payroll.nextPayday}: {formatShortDate(row.nextPayday, locale)}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 divide-x overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {t.payroll.earned}
            </p>
            <div className="mt-2">
              <MoneyDisplay amount={row.grossAmount} compact />
            </div>
          </div>

          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {t.payroll.advances}
            </p>
            <div className="mt-2">
              <MoneyDisplay amount={row.advancesTotal} compact />
            </div>
          </div>

          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {t.payroll.netToPay}
            </p>
            <div className="mt-2">
              <MoneyDisplay
                amount={row.netAmount}
                compact
                className={cn(
                  row.netAmount > 0.0001
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-900 dark:text-white",
                )}
              />
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          {row.totalShifts} {t.payroll.shiftCountUnit} ·{" "}
          {row.lastPaidAt
            ? `${t.payroll.lastPaid}: ${formatShortDate(row.lastPaidAt, locale)}`
            : t.payroll.neverPaid}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-2xl"
            onClick={() => setAdvanceOpen((current) => !current)}
            disabled={dataMode === "demo"}
          >
            <Banknote className="size-4" />
            {t.payroll.advance}
          </Button>

          {canUndoLatestPayment ? (
            <form action={paymentFormAction} className="flex-1">
              <input type="hidden" name="employeeId" value={row.employee.id} />
              <input type="hidden" name="intent" value="undo" />
              <Button
                type="submit"
                className="h-11 w-full rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                disabled={isPaying || dataMode === "demo"}
                aria-busy={isPaying}
              >
                {isPaying ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
                {t.payroll.paid}
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              className="h-11 flex-1 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={payDisabled}
              onClick={() => setConfirmOpen((current) => !current)}
            >
              <CheckCheck className="size-4" />
              {t.payroll.pay}
            </Button>
          )}
        </div>

        <Link
          href={`/employees/${row.employee.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          {t.employees.viewTimesheet}
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {advanceOpen ? (
        <div className="border-t border-slate-200/70 px-5 py-4 dark:border-slate-800">
          <form action={advanceFormAction} className="space-y-3">
            <input type="hidden" name="employeeId" value={row.employee.id} />

            <div className="space-y-2">
              <Label htmlFor={`advance-amount-${row.employee.id}`}>
                {t.payroll.advanceAmount}
              </Label>
              <Input
                id={`advance-amount-${row.employee.id}`}
                name="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={advanceAmount}
                onChange={(event) => setAdvanceAmount(event.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-10 flex-1 rounded-2xl"
                onClick={() => {
                  setAdvanceOpen(false);
                  setAdvanceAmount("");
                }}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                className="h-10 flex-1 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                disabled={isAdvancing || dataMode === "demo"}
                aria-busy={isAdvancing}
              >
                {isAdvancing ? <Loader2 className="size-4 animate-spin" /> : null}
                {t.payroll.advance}
              </Button>
            </div>

            {advanceFeedback ? (
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  advanceState.status === "error"
                    ? "border border-destructive/20 bg-destructive/10 text-destructive"
                    : "border border-success/20 bg-success/10 text-success",
                )}
              >
                {advanceFeedback}
              </div>
            ) : null}
          </form>
        </div>
      ) : null}

      {confirmOpen && row.periodStart && row.periodEnd ? (
        <div className="border-t border-slate-200/70 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t.payroll.confirmPayment}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {row.employee.fullName}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {t.payroll.dates}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                {formatShortDate(row.periodStart, locale)} - {formatShortDate(row.periodEnd, locale)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {t.payroll.netToPay}
              </p>
              <div className="mt-2">
                <MoneyDisplay amount={row.netAmount} compact />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {t.payroll.earned}
              </p>
              <div className="mt-2">
                <MoneyDisplay amount={row.grossAmount} compact />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {t.payroll.advances}
              </p>
              <div className="mt-2">
                <MoneyDisplay amount={row.advancesTotal} compact />
              </div>
            </div>
          </div>

          <form action={paymentFormAction} className="mt-4 flex gap-2">
            <input type="hidden" name="employeeId" value={row.employee.id} />
            <input type="hidden" name="amount" value={row.netAmount.toString()} />
            <input type="hidden" name="intent" value="pay" />

            <Button
              type="button"
              variant="ghost"
              className="h-10 flex-1 rounded-2xl"
              onClick={() => setConfirmOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              className="h-10 flex-1 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={isPaying || dataMode === "demo"}
              aria-busy={isPaying}
            >
              {isPaying ? <Loader2 className="size-4 animate-spin" /> : null}
              {t.payroll.pay}
            </Button>
          </form>
        </div>
      ) : null}

      {paymentFeedback ? (
        <div
          className={cn(
            "border-t px-5 py-3 text-sm",
            paymentState.status === "error"
              ? "border-destructive/20 bg-destructive/10 text-destructive"
              : "border-success/20 bg-success/10 text-success",
          )}
        >
          {paymentFeedback}
        </div>
      ) : null}
    </div>
  );
}

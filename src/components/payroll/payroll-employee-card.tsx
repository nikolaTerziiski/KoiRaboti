"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { bg, enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { AlertTriangle, Banknote, CheckCheck, Loader2, Undo2 } from "lucide-react";
import type { PayrollPaymentActionState } from "@/actions/payments";
import {
  addPayrollAdvanceAction,
  togglePayrollPaymentAction,
} from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyDisplay } from "@/components/ui/money-display";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { SnapshotMode } from "@/lib/types";
import type { PayrollRow } from "@/lib/payroll";

const initialPaymentActionState: PayrollPaymentActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  refreshKey: null,
};

type PayrollEmployeeCardProps = {
  row: PayrollRow;
  periodStart: string;
  periodEnd: string;
  dataMode: SnapshotMode;
};

function getDateLocale(locale: "bg" | "en") {
  return locale === "bg" ? bg : enUS;
}

export function PayrollEmployeeCard({
  row,
  periodStart,
  periodEnd,
  dataMode,
}: PayrollEmployeeCardProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const refreshRef = useRef<string | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceState, advanceFormAction, isAdvancing] = useActionState(
    addPayrollAdvanceAction,
    initialPaymentActionState,
  );
  const [paymentState, paymentFormAction, isTogglingPayment] = useActionState(
    togglePayrollPaymentAction,
    initialPaymentActionState,
  );

  useEffect(() => {
    const refreshKey =
      advanceState.status === "success"
        ? advanceState.refreshKey
        : paymentState.status === "success"
          ? paymentState.refreshKey
          : null;

    if (refreshKey && refreshRef.current !== refreshKey) {
      refreshRef.current = refreshKey;
      window.setTimeout(() => {
        setAdvanceOpen(false);
        setAdvanceAmount("");
        router.refresh();
      }, 0);
    }
  }, [advanceState, paymentState, router]);

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

  const workedDateLabels = row.workedDates.map((dateKey) =>
    format(parseISO(dateKey), "d MMM", {
      locale: getDateLocale(locale),
    }),
  );
  const canCreateSettlement = !row.isPaid && !row.isSettled && row.netAmountToPay > 0;
  const advanceDisabled = dataMode === "demo" || row.isSettled;
  const paymentDisabled =
    isTogglingPayment ||
    dataMode === "demo" ||
    (!row.isPaid && !canCreateSettlement);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white transition-all duration-200 dark:bg-slate-900",
        row.isPaid || row.isSettled
          ? "border-emerald-100 dark:border-emerald-900/40"
          : "border-slate-200 shadow-sm dark:border-slate-700",
      )}
    >
      <div className="px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "truncate font-bold",
              row.isSettled
                ? "text-slate-500 dark:text-slate-400"
                : "text-slate-900 dark:text-white",
            )}
          >
            {row.employee.fullName}
          </p>
          {row.isPaid && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCheck className="size-3" />
              {t.payroll.paidBadge}
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold tabular-nums dark:bg-slate-800">
            {row.totalUnits.toFixed(1)} {t.payroll.shifts}
          </span>
          {workedDateLabels.length > 0 && (
            <span className="truncate">{workedDateLabels.join(", ")}</span>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 border-y border-slate-100 dark:border-slate-800 sm:grid-cols-4">
        <div className="border-b border-r border-slate-100 px-3 py-3 dark:border-slate-800 sm:border-b-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {t.payroll.earned}
          </p>
          <div className="mt-1">
            <MoneyDisplay amount={row.totalAmount} compact />
          </div>
        </div>

        <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-800 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {t.payroll.advances}
          </p>
          <div className="mt-1">
            <MoneyDisplay amount={row.advancesTotal} compact />
          </div>
        </div>

        <div className="border-r border-slate-100 px-3 py-3 dark:border-slate-800">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {t.payroll.settledInRangeLabel}
          </p>
          <div className="mt-1">
            <MoneyDisplay amount={row.settlementsTotal} compact />
          </div>
        </div>

        <div className="px-3 py-3">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider",
              row.netAmountToPay < 0
                ? "text-rose-500"
                : row.isSettled
                  ? "text-slate-400"
                  : "text-emerald-600/80 dark:text-emerald-500/70",
            )}
          >
            {t.payroll.netToPay}
          </p>
          <div className="mt-1">
            <MoneyDisplay
              amount={row.netAmountToPay}
              compact
              className={cn(
                row.netAmountToPay < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : row.isSettled
                    ? "text-slate-400"
                    : "text-emerald-600 dark:text-emerald-400",
              )}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 px-4 pt-3">
        {row.carryoverAmount > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>
                {t.payroll.carryoverDetail}{" "}
                <span className="font-bold">
                  {row.carryoverAmount.toFixed(2)} EUR
                </span>
              </span>
            </div>
          </div>
        )}

        {row.settlementsTotal > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
            {t.payroll.settledInRange.replace(
              "{amount}",
              row.settlementsTotal.toFixed(2),
            )}
          </div>
        )}

        {row.hasOverlappingSettlement && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            {t.payroll.overlapWarning}
          </div>
        )}
      </div>

      <div className="flex gap-2 px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 flex-1 rounded-xl text-sm font-semibold"
          onClick={() => setAdvanceOpen((open) => !open)}
          disabled={advanceDisabled}
        >
          <Banknote className="size-3.5" />
          {t.payroll.advance}
        </Button>

        <form action={paymentFormAction} className="flex-1">
          <input type="hidden" name="employeeId" value={row.employee.id} />
          <input type="hidden" name="periodStart" value={periodStart} />
          <input type="hidden" name="periodEnd" value={periodEnd} />
          <input type="hidden" name="amount" value={row.netAmountToPay.toString()} />
          <Button
            type="submit"
            size="sm"
            className={cn(
              "h-9 w-full rounded-xl text-sm font-semibold transition-all",
              row.isPaid
                ? "border border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-transparent"
                : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-800 dark:disabled:text-slate-400",
            )}
            disabled={paymentDisabled}
            aria-busy={isTogglingPayment}
          >
            {isTogglingPayment ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : row.isPaid ? (
              <Undo2 className="size-3.5" />
            ) : (
              <CheckCheck className="size-3.5" />
            )}
            {row.isPaid || row.isSettled ? t.payroll.paid : t.payroll.pay}
          </Button>
        </form>
      </div>

      {advanceOpen && (
        <div className="mx-4 mb-4 rounded-xl border border-slate-200/60 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
          <form action={advanceFormAction} className="space-y-3">
            <input type="hidden" name="employeeId" value={row.employee.id} />
            <input type="hidden" name="periodStart" value={periodStart} />
            <input type="hidden" name="periodEnd" value={periodEnd} />

            <Label
              htmlFor={`advance-amount-${row.employee.id}`}
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
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
              placeholder="0.00"
              className="h-11 rounded-xl text-center text-lg font-bold tracking-widest"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 flex-1 rounded-xl"
                onClick={() => {
                  setAdvanceOpen(false);
                  setAdvanceAmount("");
                }}
                disabled={isAdvancing}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 flex-1 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                disabled={isAdvancing || advanceDisabled}
                aria-busy={isAdvancing}
              >
                {isAdvancing ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
                {t.common.save}
              </Button>
            </div>

            {advanceFeedback && (
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold",
                  advanceState.status === "error"
                    ? "border border-rose-200 bg-rose-50 text-rose-700"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700",
                )}
              >
                {advanceFeedback}
              </div>
            )}
          </form>
        </div>
      )}

      {paymentFeedback && (
        <div
          className={cn(
            "mx-4 mb-4 rounded-lg px-3 py-2 text-xs font-semibold",
            paymentState.status === "error"
              ? "border border-rose-200 bg-rose-50 text-rose-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700",
          )}
        >
          {paymentFeedback}
        </div>
      )}
    </div>
  );
}

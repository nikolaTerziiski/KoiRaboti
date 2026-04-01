"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CheckCheck, Loader2, Undo2 } from "lucide-react";
import type { PayrollPaymentActionState } from "@/actions/payments";
import {
  addPayrollAdvanceAction,
  togglePayrollPaymentAction,
} from "@/actions/payments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/context";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PayrollPeriod, SnapshotMode } from "@/lib/types";
import type { PayrollRow } from "@/lib/payroll";

const initialPaymentActionState: PayrollPaymentActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  refreshKey: null,
};

type PayrollEmployeeCardProps = {
  row: PayrollRow;
  payrollMonth: string;
  payrollPeriod: PayrollPeriod;
  dataMode: SnapshotMode;
};

export function PayrollEmployeeCard({
  row,
  payrollMonth,
  payrollPeriod,
  dataMode,
}: PayrollEmployeeCardProps) {
  const router = useRouter();
  const { t } = useLocale();
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

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white transition-all duration-200 dark:bg-slate-900",
        row.isPaid
          ? "border-emerald-100 dark:border-emerald-900/40"
          : "border-slate-200 shadow-sm dark:border-slate-700",
      )}
    >
      {/* ── Row 1: Name + meta ───────────────────────────────────── */}
      <div className="px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "truncate font-bold",
              row.isPaid
                ? "text-slate-400 dark:text-slate-500"
                : "text-slate-900 dark:text-white",
            )}
          >
            {row.employee.fullName}
          </p>
          {row.isPaid && (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400"
            >
              <CheckCheck className="mr-1 size-3" />
              {t.payroll.paidBadge}
            </Badge>
          )}
        </div>

        {/* Shifts + dates */}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold tabular-nums dark:bg-slate-800">
            {row.totalUnits.toFixed(1)} {t.payroll.shifts}
          </span>
          {row.workedDates.length > 0 && (
            <span className="truncate">{row.workedDates.join(", ")}</span>
          )}
        </div>
      </div>

      {/* ── Row 2: Financial strip ───────────────────────────────── */}
      {/* Net to pay gets the dominant column; advances only rendered when non-zero */}
      <div
        className={cn(
          "mt-3 grid divide-x divide-slate-100 border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800",
          row.advancesTotal > 0 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {/* Earned */}
        <div className="px-3 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {t.payroll.earned}
          </p>
          <p className="mt-1 text-sm font-bold tabular-nums text-slate-700 dark:text-slate-300">
            {formatCurrency(row.totalAmount)}
          </p>
        </div>

        {/* Advances — only rendered when there is something to show */}
        {row.advancesTotal > 0 && (
          <div className="px-3 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
              {t.payroll.advances}
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
              − {formatCurrency(row.advancesTotal)}
            </p>
          </div>
        )}

        {/* Net to pay — always the rightmost, always the largest number */}
        <div className="px-3 py-3 text-center">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider",
              row.isPaid ? "text-slate-400" : "text-emerald-600/80 dark:text-emerald-500/70",
            )}
          >
            {t.payroll.netToPay}
          </p>
          <p
            className={cn(
              "mt-1 text-base font-extrabold tabular-nums leading-tight",
              row.netAmountToPay < 0
                ? "text-rose-600 dark:text-rose-400"
                : row.isPaid
                  ? "text-slate-400"
                  : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {formatCurrency(row.netAmountToPay)}
          </p>
        </div>
      </div>

      {/* ── Row 3: Action buttons ────────────────────────────────── */}
      <div className="flex gap-2 px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 flex-1 rounded-xl text-sm font-semibold"
          onClick={() => setAdvanceOpen((v) => !v)}
          disabled={dataMode === "demo" || row.isPaid}
        >
          <Banknote className="size-3.5" />
          {t.payroll.advance}
        </Button>

        <form action={paymentFormAction} className="flex-1">
          <input type="hidden" name="employeeId" value={row.employee.id} />
          <input type="hidden" name="payrollMonth" value={payrollMonth} />
          <input type="hidden" name="payrollPeriod" value={payrollPeriod} />
          <input type="hidden" name="amount" value={row.netAmountToPay.toString()} />
          <Button
            type="submit"
            size="sm"
            className={cn(
              "h-9 w-full rounded-xl text-sm font-semibold transition-all",
              row.isPaid
                ? "border border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-transparent"
                : "bg-emerald-600 text-white hover:bg-emerald-700",
            )}
            disabled={isTogglingPayment || dataMode === "demo"}
            aria-busy={isTogglingPayment}
          >
            {isTogglingPayment ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : row.isPaid ? (
              <Undo2 className="size-3.5" />
            ) : (
              <CheckCheck className="size-3.5" />
            )}
            {row.isPaid ? t.payroll.paid : t.payroll.pay}
          </Button>
        </form>
      </div>

      {/* ── Advance form (collapsible) ───────────────────────────── */}
      {advanceOpen && (
        <div className="mx-4 mb-4 rounded-xl border border-slate-200/60 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
          <form action={advanceFormAction} className="space-y-3">
            <input type="hidden" name="employeeId" value={row.employee.id} />
            <input type="hidden" name="payrollMonth" value={payrollMonth} />
            <input type="hidden" name="payrollPeriod" value={payrollPeriod} />

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
              onChange={(e) => setAdvanceAmount(e.target.value)}
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
                disabled={isAdvancing || dataMode === "demo"}
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

      {/* Payment feedback */}
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

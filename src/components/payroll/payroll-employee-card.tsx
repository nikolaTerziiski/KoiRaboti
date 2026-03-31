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
import { MoneyDisplay } from "@/components/ui/money-display";
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

  // UX FIX: Strict visual hierarchy. 
  // If paid, it fades out to reduce cognitive load. If unpaid, it remains bright white.
  const cardClass = row.isPaid
    ? "border-slate-200/60 bg-slate-50/50 opacity-60 grayscale-[0.6] dark:border-slate-800 dark:bg-slate-950/50"
    : "border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900";

  return (
    <div className={cn("rounded-[1.5rem] border p-5 transition-all duration-300", cardClass)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <p className="truncate text-xl font-extrabold text-slate-900 dark:text-white">
              {row.employee.fullName}
            </p>
            {row.isPaid ? (
              <Badge className="border-emerald-200 bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700" variant="outline">
                <CheckCheck className="mr-1.5 size-4" />
                {t.payroll.paidBadge}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold bg-slate-100 px-2.5 py-1 rounded-lg dark:bg-slate-800">
              {row.totalUnits.toFixed(1)} {t.payroll.shifts}
            </span>
            <span className="text-xs">
              {row.workedDates.length > 0 ? row.workedDates.join(", ") : "—"}
            </span>
          </div>
        </div>

        <div className="shrink-0 rounded-2xl bg-slate-50 p-4 text-right dark:bg-slate-950/50">
          <div className="flex justify-between gap-6 sm:flex-col sm:gap-1">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {t.payroll.earned}
            </p>
            <MoneyDisplay amount={row.totalAmount} compact align="end" className="text-lg font-bold text-slate-700 dark:text-slate-300" />
          </div>
          
          {row.advancesTotal > 0 ? (
            <div className="mt-2 flex justify-between gap-6 sm:flex-col sm:gap-1">
              <p className="text-xs font-bold uppercase tracking-widest text-rose-500">
                {t.payroll.advances}
              </p>
              <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                - {formatCurrency(row.advancesTotal)}
              </p>
            </div>
          ) : null}
          
          <div className="mt-4 flex justify-between items-end gap-6 sm:mt-3 sm:flex-col sm:gap-1">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {t.payroll.netToPay}
            </p>
            {/* UX FIX: Massive text size for the final payout number */}
            <MoneyDisplay
              amount={row.netAmountToPay}
              compact
              align="end"
              className={cn("text-3xl font-black tracking-tight", row.netAmountToPay < 0 ? "text-rose-600" : "text-emerald-600")}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="h-14 flex-1 rounded-xl border-slate-200 text-base font-bold shadow-sm hover:bg-slate-50 dark:border-slate-700"
          onClick={() => setAdvanceOpen((current) => !current)}
          disabled={dataMode === "demo" || row.isPaid}
        >
          <Banknote className="mr-2 size-5" />
          {t.payroll.advance}
        </Button>
        <form action={paymentFormAction} className="flex-1">
          <input type="hidden" name="employeeId" value={row.employee.id} />
          <input type="hidden" name="payrollMonth" value={payrollMonth} />
          <input type="hidden" name="payrollPeriod" value={payrollPeriod} />
          <input type="hidden" name="amount" value={row.netAmountToPay.toString()} />
          <Button
            type="submit"
            variant={row.isPaid ? "outline" : "default"}
            className={cn(
              "h-14 w-full rounded-xl text-base font-bold shadow-sm transition-all",
              row.isPaid 
                ? "border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" 
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
            disabled={isTogglingPayment || dataMode === "demo"}
            aria-busy={isTogglingPayment}
          >
            {isTogglingPayment ? (
              <Loader2 className="mr-2 size-5 animate-spin" />
            ) : row.isPaid ? (
              <Undo2 className="mr-2 size-5" />
            ) : (
              <CheckCheck className="mr-2 size-5" />
            )}
            {row.isPaid ? "Undo Payment" : t.payroll.pay}
          </Button>
        </form>
      </div>

      {advanceOpen ? (
        <form action={advanceFormAction} className="mt-4 space-y-4 rounded-2xl border border-slate-200/60 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
          <input type="hidden" name="employeeId" value={row.employee.id} />
          <input type="hidden" name="payrollMonth" value={payrollMonth} />
          <input type="hidden" name="payrollPeriod" value={payrollPeriod} />
          <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300" htmlFor={`advance-amount-${row.employee.id}`}>
              {t.payroll.advanceAmount}
            </Label>
            <Input
              id={`advance-amount-${row.employee.id}`}
              name="amount"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={advanceAmount}
              onChange={(event) => setAdvanceAmount(event.target.value)}
              placeholder="0.00"
              className="h-14 rounded-xl text-center text-xl font-black tracking-widest shadow-inner focus-visible:ring-emerald-500"
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              className="h-12 flex-1 rounded-xl font-bold"
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
              className="h-12 flex-1 rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              disabled={isAdvancing || dataMode === "demo"}
              aria-busy={isAdvancing}
            >
              {isAdvancing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t.common.save}
            </Button>
          </div>
          {advanceFeedback ? (
            <div
              className={cn(
                "rounded-xl px-4 py-3 text-sm font-semibold",
                advanceState.status === "error"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200",
              )}
            >
              {advanceFeedback}
            </div>
          ) : null}
        </form>
      ) : null}

      {paymentFeedback ? (
        <div
          className={cn(
            "mt-4 rounded-xl px-4 py-3 text-sm font-semibold",
            paymentState.status === "error"
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200",
          )}
        >
          {paymentFeedback}
        </div>
      ) : null}
    </div>
  );
}
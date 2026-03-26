"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
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
  const { locale } = useLocale();
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

  const labels = useMemo(
    () => ({
      earned: locale === "bg" ? "Спечелено" : "Earned",
      advances: locale === "bg" ? "Аванси" : "Advances",
      netToPay: locale === "bg" ? "Нетно за плащане" : "Net to pay",
      dates: locale === "bg" ? "Дати" : "Dates",
      shifts: locale === "bg" ? "Брой смени" : "Shifts",
      paidBadge: locale === "bg" ? "Платено" : "Paid",
      pay: locale === "bg" ? "Плати" : "Pay",
      paid: locale === "bg" ? "Платено" : "Paid",
      advance: locale === "bg" ? "Дай Аванс" : "Give Advance",
      advanceAmount: locale === "bg" ? "Аванс (EUR)" : "Advance (EUR)",
      saveAdvance: locale === "bg" ? "Запази" : "Save",
      cancel: locale === "bg" ? "Откажи" : "Cancel",
      demoNote: locale === "bg" ? "Demo режимът е само за преглед." : "Demo mode is read-only.",
      advanceSaved: locale === "bg" ? "Авансът е записан." : "Advance saved.",
      paymentSaved:
        locale === "bg" ? "Плащането е обновено." : "Payroll payment updated.",
      advanceError:
        locale === "bg"
          ? "Авансът не може да бъде записан."
          : "Advance could not be saved.",
      paymentError:
        locale === "bg"
          ? "Плащането не може да бъде обновено."
          : "Payroll payment could not be updated.",
    }),
    [locale],
  );

  const advanceFeedback =
    advanceState.status === "error"
      ? advanceState.message ?? labels.advanceError
      : advanceState.status === "success"
        ? labels.advanceSaved
        : null;

  const paymentFeedback =
    paymentState.status === "error"
      ? paymentState.message ?? labels.paymentError
      : paymentState.status === "success"
        ? labels.paymentSaved
        : null;

  const cardClass = row.isPaid
    ? "border-green-200 bg-green-50"
    : row.employee.role === "kitchen"
      ? "border-purple-200 bg-purple-50"
      : "border-green-200 bg-green-50";

  const toggleButtonClass = row.isPaid
    ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
    : "";

  return (
    <div className={cn("rounded-2xl border p-3", cardClass)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{row.employee.fullName}</p>
            {row.isPaid ? (
              <Badge className="border-green-200 bg-green-100 text-green-700" variant="outline">
                {labels.paidBadge}
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {labels.shifts}: {row.totalUnits.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">
            {labels.dates}: {row.workedDates.length > 0 ? row.workedDates.join(", ") : "—"}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {labels.earned}
          </p>
          <MoneyDisplay amount={row.totalAmount} compact align="end" />
          {row.advancesTotal > 0 ? (
            <p className="mt-2 text-xs font-medium text-destructive">
              {labels.advances}: - {formatCurrency(row.advancesTotal)}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            {labels.netToPay}
          </p>
          <MoneyDisplay
            amount={row.netAmountToPay}
            compact
            align="end"
            className={row.netAmountToPay < 0 ? "text-destructive" : undefined}
            secondaryClassName={row.netAmountToPay < 0 ? "text-destructive/80" : undefined}
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => setAdvanceOpen((current) => !current)}
          disabled={dataMode === "demo"}
        >
          <Banknote className="size-4" />
          {labels.advance}
        </Button>
        <form action={paymentFormAction} className="flex-1">
          <input type="hidden" name="employeeId" value={row.employee.id} />
          <input type="hidden" name="payrollMonth" value={payrollMonth} />
          <input type="hidden" name="payrollPeriod" value={payrollPeriod} />
          <input type="hidden" name="amount" value={row.netAmountToPay.toString()} />
          <Button
            type="submit"
            variant={row.isPaid ? "outline" : "default"}
            className={cn("w-full", toggleButtonClass)}
            size="sm"
            disabled={isTogglingPayment || dataMode === "demo"}
            aria-busy={isTogglingPayment}
          >
            {isTogglingPayment ? (
              <Loader2 className="size-4 animate-spin" />
            ) : row.isPaid ? (
              <Undo2 className="size-4" />
            ) : (
              <CheckCheck className="size-4" />
            )}
            {row.isPaid ? labels.paid : labels.pay}
          </Button>
        </form>
      </div>

      {advanceOpen ? (
        <form action={advanceFormAction} className="mt-3 space-y-3 rounded-2xl bg-card p-3">
          <input type="hidden" name="employeeId" value={row.employee.id} />
          <input type="hidden" name="payrollMonth" value={payrollMonth} />
          <input type="hidden" name="payrollPeriod" value={payrollPeriod} />
          <div className="space-y-2">
            <Label htmlFor={`advance-amount-${row.employee.id}`}>{labels.advanceAmount}</Label>
            <Input
              id={`advance-amount-${row.employee.id}`}
              name="amount"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={advanceAmount}
              onChange={(event) => setAdvanceAmount(event.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setAdvanceOpen(false);
                setAdvanceAmount("");
              }}
              disabled={isAdvancing}
            >
              {labels.cancel}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isAdvancing || dataMode === "demo"}
              aria-busy={isAdvancing}
            >
              {isAdvancing ? <Loader2 className="size-4 animate-spin" /> : null}
              {labels.saveAdvance}
            </Button>
          </div>
          {advanceFeedback ? (
            <div
              className={cn(
                "rounded-xl px-3 py-2 text-xs",
                advanceState.status === "error"
                  ? "border border-destructive/20 bg-destructive/10 text-destructive"
                  : "border border-success/20 bg-success/10 text-success",
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
            "mt-3 rounded-xl px-3 py-2 text-xs",
            paymentState.status === "error"
              ? "border border-destructive/20 bg-destructive/10 text-destructive"
              : "border border-success/20 bg-success/10 text-success",
          )}
        >
          {paymentFeedback}
        </div>
      ) : null}

      {dataMode === "demo" ? (
        <div className="mt-3 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          {labels.demoNote}
        </div>
      ) : null}
    </div>
  );
}

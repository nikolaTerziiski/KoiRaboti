"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { EmployeeActionState } from "@/actions/employees";
import { createEmployeeAction } from "@/actions/employees";
import {
  EmployeePaymentScheduleFields,
  type EmployeePaymentScheduleDraft,
} from "@/components/employees/payment-schedule-fields";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { formatBgnCurrencyFromEur } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";
import type { SnapshotMode, TurnoverSource } from "@/lib/types";

const initialEmployeeActionState: EmployeeActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  refreshKey: null,
};

type EmployeeCreateFormProps = {
  dataMode: SnapshotMode;
  onSuccess?: () => void;
};

type EmployeeCreateDraft = {
  fullName: string;
  role: "kitchen" | "service";
  phoneNumber: string;
  dailyRate: string;
  hasPercentage: boolean;
  percentageRate: string;
  turnoverSource: TurnoverSource;
  balanceStartsFrom: string;
  payment: EmployeePaymentScheduleDraft;
};

function toNumber(value: string) {
  const normalizedValue = value.replace(/,/g, ".").trim();
  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function createInitialDraft(): EmployeeCreateDraft {
  return {
    fullName: "",
    role: "service",
    phoneNumber: "",
    dailyRate: "",
    hasPercentage: false,
    percentageRate: "",
    turnoverSource: "personal",
    balanceStartsFrom: new Date().toISOString().slice(0, 10),
    payment: {
      paymentSchedule: "twice_monthly",
      paymentDay1: "1",
      paymentDay2: "16",
      paymentWeekday: 1,
    },
  };
}

export function EmployeeCreateForm({
  dataMode,
  onSuccess,
}: EmployeeCreateFormProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const refreshedKeyRef = useRef<string | null>(null);
  const [actionState, formAction, isPending] = useActionState(
    createEmployeeAction,
    initialEmployeeActionState,
  );
  const [draft, setDraft] = useState<EmployeeCreateDraft>(createInitialDraft);

  useEffect(() => {
    if (
      actionState.status === "success" &&
      actionState.refreshKey &&
      refreshedKeyRef.current !== actionState.refreshKey
    ) {
      refreshedKeyRef.current = actionState.refreshKey;
      onSuccess?.();
      router.refresh();
    }
  }, [actionState, onSuccess, router]);

  const feedbackMessage =
    actionState.messageKey === "msgCreateSuccess"
      ? t.employees.msgCreateSuccess
      : actionState.messageKey === "msgDuplicatePhone"
        ? t.employees.msgDuplicatePhone
        : actionState.messageKey === "msgSaveError"
          ? t.employees.msgSaveError
          : actionState.message;

  return (
    <DialogContent
      className="overflow-hidden rounded-[1.75rem] p-0 sm:max-w-md"
      showClose
    >
      <DialogHeader className="border-b border-slate-200/70 p-6 pr-16 dark:border-slate-800">
        <DialogTitle>{t.employees.addEmployee}</DialogTitle>
        <DialogDescription>{t.employees.addEmployeeDesc}</DialogDescription>
      </DialogHeader>

      <div className="bg-slate-50/50 p-6 dark:bg-slate-950/80">
        <form action={formAction} className="space-y-4">
          <input
            type="hidden"
            name="balanceStartsFrom"
            value={draft.balanceStartsFrom}
          />

          <div className="space-y-2">
            <Label htmlFor="create-fullName">{t.employees.name}</Label>
            <Input
              id="create-fullName"
              name="fullName"
              required
              value={draft.fullName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, fullName: event.target.value }))
              }
              className="h-12 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-role">{t.employees.role}</Label>
            <SelectField
              id="create-role"
              name="role"
              value={draft.role}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  role: event.target.value === "kitchen" ? "kitchen" : "service",
                }))
              }
              className="h-12 rounded-2xl"
            >
              <option value="service">{t.common.service}</option>
              <option value="kitchen">{t.common.kitchen}</option>
            </SelectField>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-phoneNumber">{t.employees.phoneNumber}</Label>
            <Input
              id="create-phoneNumber"
              name="phoneNumber"
              type="tel"
              placeholder={t.common.optional}
              value={draft.phoneNumber}
              onChange={(event) =>
                setDraft((current) => ({ ...current, phoneNumber: event.target.value }))
              }
              className="h-12 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-dailyRate">{t.employees.dailyRateEur}</Label>
            <Input
              id="create-dailyRate"
              name="dailyRate"
              inputMode="decimal"
              required
              min="0"
              value={draft.dailyRate}
              onChange={(event) =>
                setDraft((current) => ({ ...current, dailyRate: event.target.value }))
              }
              className="h-12 rounded-2xl"
            />
            <p className="text-xs text-muted-foreground">
              {t.employees.bgnView} {formatBgnCurrencyFromEur(toNumber(draft.dailyRate))}
            </p>
          </div>

          <input
            type="hidden"
            name="payType"
            value={draft.hasPercentage ? "fixed_plus_percentage" : "fixed"}
          />
          <input type="hidden" name="turnoverSource" value={draft.turnoverSource} />

          <div className="space-y-3 rounded-[1.5rem] border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={draft.hasPercentage}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    hasPercentage: event.target.checked,
                    percentageRate: event.target.checked ? current.percentageRate : "",
                    turnoverSource: event.target.checked
                      ? current.turnoverSource
                      : "personal",
                  }))
                }
                className="size-5 rounded-lg border-slate-300 text-emerald-600 accent-emerald-600"
              />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {locale === "bg"
                  ? "Работи ли с процент от оборота?"
                  : "Works with turnover percentage?"}
              </span>
            </label>

            {draft.hasPercentage ? (
              <div className="space-y-4 border-t border-slate-200/70 pt-3 dark:border-slate-800">
                <div className="space-y-2">
                  <Label htmlFor="create-percentageRate">
                    {locale === "bg" ? "Процент (%)" : "Percentage (%)"}
                  </Label>
                  <Input
                    id="create-percentageRate"
                    name="percentageRate"
                    inputMode="decimal"
                    placeholder="2"
                    value={draft.percentageRate}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, percentageRate: event.target.value }))
                    }
                    className="h-12 rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-turnoverSource">
                    {locale === "bg" ? "Източник на оборот" : "Turnover source"}
                  </Label>
                  <SelectField
                    id="create-turnoverSource"
                    value={draft.turnoverSource}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        turnoverSource:
                          event.target.value === "department"
                            ? "department"
                            : "personal",
                      }))
                    }
                    className="h-12 rounded-2xl"
                  >
                    <option value="personal">
                      {locale === "bg"
                        ? "Личен оборот (сервиз)"
                        : "Personal turnover (service)"}
                    </option>
                    <option value="department">
                      {locale === "bg"
                        ? "Оборот кухня (от управител)"
                        : "Kitchen turnover (from manager)"}
                    </option>
                  </SelectField>
                  <p className="text-xs text-muted-foreground">
                    {locale === "bg"
                      ? "Сервизът ползва личния си оборот. Кухнята ползва общия оборот кухня, въведен от управителя."
                      : "Service uses their personal turnover. Kitchen uses department turnover entered by the manager."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-[1.5rem] border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t.employees.paymentSchedule}
            </p>

            <EmployeePaymentScheduleFields
              idPrefix="create-employee-payment"
              value={draft.payment}
              onChange={(field, nextValue) =>
                setDraft((current) => ({
                  ...current,
                  payment: {
                    ...current.payment,
                    [field]: nextValue,
                  } as EmployeePaymentScheduleDraft,
                }))
              }
              fieldNames={{
                paymentSchedule: "paymentSchedule",
                paymentDay1: "paymentDay1",
                paymentDay2: "paymentDay2",
                paymentWeekday: "paymentWeekday",
              }}
            />
          </div>

          {actionState.status !== "idle" ? (
            <div
              className={
                actionState.status === "success"
                  ? "rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"
                  : "rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              }
            >
              {feedbackMessage}
            </div>
          ) : null}

          {dataMode === "demo" ? (
            <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              {t.employees.demoNote}
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-12 w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={isPending || dataMode === "demo"}
            aria-busy={isPending}
          >
            <Plus className="size-4" />
            {isPending ? t.employees.savingEmployee : t.employees.addToRoster}
          </Button>
        </form>
      </div>
    </DialogContent>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, setISODay, startOfWeek } from "date-fns";
import { bg, enUS } from "date-fns/locale";
import { ClipboardList, Pencil, Percent, Phone, Wallet } from "lucide-react";
import type { EmployeeActionState } from "@/actions/employees";
import {
  setEmployeeActiveAction,
  updateEmployeeAction,
} from "@/actions/employees";
import {
  EmployeePaymentScheduleFields,
  type EmployeePaymentScheduleDraft,
} from "@/components/employees/payment-schedule-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { formatBgnCurrencyFromEur, formatCurrency } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";
import type { Employee, SnapshotMode, TurnoverSource } from "@/lib/types";
import { cn } from "@/lib/utils";

const initialEmployeeActionState: EmployeeActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  refreshKey: null,
};

type CurrencyMode = "EUR" | "BGN";

type EmployeeRowEditorProps = {
  employee: Employee;
  dataMode: SnapshotMode;
  currencyMode: CurrencyMode;
};

type EmployeeDraft = {
  fullName: string;
  role: Employee["role"];
  phoneNumber: string;
  dailyRate: string;
  hasPercentage: boolean;
  percentageRate: string;
  turnoverSource: TurnoverSource;
  payment: EmployeePaymentScheduleDraft;
};

function getDateLocale(locale: "bg" | "en") {
  return locale === "bg" ? bg : enUS;
}

function toNumber(value: string) {
  const normalizedValue = value.replace(/,/g, ".").trim();
  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function getEmployeeInitials(fullName: string) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "?";
}

function getWeekdayLabel(day: number, locale: "bg" | "en") {
  const monday = startOfWeek(new Date("2026-01-05T12:00:00.000Z"), {
    weekStartsOn: 1,
  });

  return format(setISODay(monday, day), "EEEE", {
    locale: getDateLocale(locale),
  });
}

function formatScheduleSummary(
  employee: Employee,
  t: ReturnType<typeof useLocale>["t"],
  locale: "bg" | "en",
) {
  if (employee.paymentSchedule === "weekly") {
    return `${t.employees.weekly} · ${getWeekdayLabel(employee.paymentWeekday ?? 1, locale)}`;
  }

  if (employee.paymentSchedule === "monthly") {
    return `${t.employees.monthly} · ${t.employees.payDay1} ${employee.paymentDay1 ?? 1}`;
  }

  if (employee.paymentSchedule === "on_demand") {
    return t.employees.onDemand;
  }

  return `${t.employees.twiceMonthly} · ${t.employees.payDay1} ${employee.paymentDay1 ?? 1} · ${t.employees.payDay2} ${employee.paymentDay2 ?? 16}`;
}

function createInitialDraft(employee: Employee): EmployeeDraft {
  return {
    fullName: employee.fullName,
    role: employee.role,
    phoneNumber: employee.phoneNumber ?? "",
    dailyRate: employee.dailyRate.toString(),
    hasPercentage: employee.payType === "fixed_plus_percentage",
    percentageRate:
      employee.payType === "fixed_plus_percentage"
        ? (employee.percentageRate * 100).toString()
        : "",
    turnoverSource: employee.turnoverSource ?? "personal",
    payment: {
      paymentSchedule: employee.paymentSchedule ?? "twice_monthly",
      paymentDay1: String(employee.paymentDay1 ?? 1),
      paymentDay2: String(employee.paymentDay2 ?? 16),
      paymentWeekday: employee.paymentWeekday ?? 1,
    },
  };
}

function getTurnoverSourceLabel(
  turnoverSource: TurnoverSource,
  locale: "bg" | "en",
) {
  if (locale === "bg") {
    return turnoverSource === "department"
      ? "от оборот кухня"
      : "от личен оборот";
  }

  return turnoverSource === "department"
    ? "of kitchen turnover"
    : "of personal turnover";
}

export function EmployeeRowEditor({
  employee,
  dataMode,
  currencyMode,
}: EmployeeRowEditorProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const refreshRef = useRef<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateFormAction, isUpdating] = useActionState(
    updateEmployeeAction,
    initialEmployeeActionState,
  );
  const [toggleState, toggleFormAction, isToggling] = useActionState(
    setEmployeeActiveAction,
    initialEmployeeActionState,
  );
  const [draft, setDraft] = useState(() => createInitialDraft(employee));

  useEffect(() => {
    setDraft(createInitialDraft(employee));
  }, [employee]);

  useEffect(() => {
    const refreshKey =
      updateState.status === "success"
        ? updateState.refreshKey
        : toggleState.status === "success"
          ? toggleState.refreshKey
          : null;

    if (refreshKey && refreshRef.current !== refreshKey) {
      refreshRef.current = refreshKey;
      router.refresh();
      setIsEditing(false);
    }
  }, [router, toggleState, updateState]);

  const updateFeedback =
    updateState.messageKey === "msgUpdateSuccess"
      ? t.employees.msgUpdateSuccess
      : updateState.messageKey === "msgDuplicatePhone"
        ? t.employees.msgDuplicatePhone
        : updateState.messageKey === "msgSaveError"
          ? t.employees.msgSaveError
          : updateState.message;
  const toggleFeedback =
    toggleState.messageKey === "msgSaveError"
      ? t.employees.msgSaveError
      : toggleState.message;
  const roleBadgeClass =
    employee.role === "kitchen"
      ? "border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
      : "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  const roleTintClassName =
    employee.role === "kitchen"
      ? "border-purple-100 bg-purple-50/50 dark:border-purple-900/50 dark:bg-purple-950/20"
      : "border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20";
  const roleAvatarClass =
    employee.role === "kitchen"
      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200";
  const displayedDailyRate =
    currencyMode === "BGN"
      ? {
          label: t.employees.currentRate,
          primary: formatBgnCurrencyFromEur(employee.dailyRate),
          secondary: formatCurrency(employee.dailyRate),
        }
      : {
          label: t.employees.dailyRateEur,
          primary: formatCurrency(employee.dailyRate),
          secondary: formatBgnCurrencyFromEur(employee.dailyRate),
        };
  const employeeInitials = getEmployeeInitials(employee.fullName);
  const draftDailyRateHelper = `${t.employees.bgnView} ${formatBgnCurrencyFromEur(
    toNumber(draft.dailyRate),
  )}`;

  return (
    <div className={`rounded-[1.75rem] border p-5 ${roleTintClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${roleAvatarClass}`}
          >
            {employeeInitials}
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {employee.fullName}
              </p>
              <Badge className={roleBadgeClass} variant="outline">
                {employee.role === "kitchen" ? t.common.kitchen : t.common.service}
              </Badge>
            </div>
            {employee.phoneNumber ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Phone className="size-4" />
                <span>{employee.phoneNumber}</span>
              </div>
            ) : null}
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatScheduleSummary(employee, t, locale)}
            </p>
          </div>
        </div>
        <Badge variant={employee.isActive ? "success" : "outline"}>
          {employee.isActive ? t.employees.active : t.employees.inactive}
        </Badge>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Wallet className="size-4" />
            {displayedDailyRate.label}
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {displayedDailyRate.primary}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {displayedDailyRate.secondary}
            </p>
          </div>
        </div>
        {employee.payType === "fixed_plus_percentage" ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/40">
            <Percent className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              + {(employee.percentageRate * 100).toFixed(1)}%{" "}
              {getTurnoverSourceLabel(employee.turnoverSource, locale)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          type="button"
          variant={isEditing ? "default" : "outline"}
          className={cn(
            "h-11 rounded-2xl transition-colors",
            isEditing
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
          )}
          onClick={() => setIsEditing((current) => !current)}
        >
          <Pencil className="size-4" />
          {t.employees.editProfile}
        </Button>

        <form action={toggleFormAction}>
          <input type="hidden" name="employeeId" value={employee.id} />
          <input
            type="hidden"
            name="nextIsActive"
            value={employee.isActive ? "false" : "true"}
          />
          <Button
            type="submit"
            variant="outline"
            className="h-11 w-full rounded-2xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            disabled={isToggling || dataMode === "demo"}
            aria-busy={isToggling}
          >
            {isToggling
              ? employee.isActive
                ? t.employees.deactivating
                : t.employees.reactivating
              : employee.isActive
                ? t.employees.markInactive
                : t.employees.reactivate}
          </Button>
        </form>

        <Button
          asChild
          variant="outline"
          className="h-11 rounded-2xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <Link href={`/employees/${employee.id}`}>
            <ClipboardList className="size-4" />
            {t.employees.viewTimesheet}
          </Link>
        </Button>
      </div>

      {toggleState.status === "error" ? (
        <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {toggleFeedback}
        </div>
      ) : null}

      {isEditing ? (
        <form
          action={updateFormAction}
          className="mt-4 space-y-4 rounded-2xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <input type="hidden" name="employeeId" value={employee.id} />
          <input
            type="hidden"
            name="payType"
            value={draft.hasPercentage ? "fixed_plus_percentage" : "fixed"}
          />
          <input type="hidden" name="turnoverSource" value={draft.turnoverSource} />
          {draft.hasPercentage ? (
            <input type="hidden" name="percentageRate" value={draft.percentageRate} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`employee-name-${employee.id}`}>{t.employees.name}</Label>
            <Input
              id={`employee-name-${employee.id}`}
              name="fullName"
              value={draft.fullName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, fullName: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`employee-role-${employee.id}`}>{t.employees.role}</Label>
            <SelectField
              id={`employee-role-${employee.id}`}
              name="role"
              value={draft.role}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  role: event.target.value === "kitchen" ? "kitchen" : "service",
                }))
              }
              className="h-11 rounded-2xl"
            >
              <option value="service">{t.common.service}</option>
              <option value="kitchen">{t.common.kitchen}</option>
            </SelectField>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`employee-phone-${employee.id}`}>{t.employees.phoneNumber}</Label>
            <Input
              id={`employee-phone-${employee.id}`}
              name="phoneNumber"
              type="tel"
              placeholder={t.common.optional}
              value={draft.phoneNumber}
              onChange={(event) =>
                setDraft((current) => ({ ...current, phoneNumber: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`employee-rate-${employee.id}`}>{t.employees.dailyRateEur}</Label>
            <Input
              id={`employee-rate-${employee.id}`}
              name="dailyRate"
              inputMode="decimal"
              value={draft.dailyRate}
              onChange={(event) =>
                setDraft((current) => ({ ...current, dailyRate: event.target.value }))
              }
              className="h-11 rounded-2xl"
            />
            <p className="text-xs text-muted-foreground">{draftDailyRateHelper}</p>
          </div>

          <div className="space-y-3 rounded-[1.5rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/50">
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
                  <Label htmlFor={`employee-percentage-${employee.id}`}>
                    {locale === "bg" ? "Процент (%)" : "Percentage (%)"}
                  </Label>
                  <Input
                    id={`employee-percentage-${employee.id}`}
                    inputMode="decimal"
                    placeholder="2"
                    value={draft.percentageRate}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        percentageRate: event.target.value,
                      }))
                    }
                    className="h-11 rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`employee-turnover-source-${employee.id}`}>
                    {locale === "bg" ? "Източник на оборот" : "Turnover source"}
                  </Label>
                  <SelectField
                    id={`employee-turnover-source-${employee.id}`}
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
                    className="h-11 rounded-2xl"
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

          <div className="space-y-3 rounded-[1.5rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t.employees.paymentSchedule}
            </p>

            <EmployeePaymentScheduleFields
              idPrefix={`employee-payment-${employee.id}`}
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

          {updateState.status === "error" ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {updateFeedback}
            </div>
          ) : null}

          {updateState.status === "success" ? (
            <div className="rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
              {updateFeedback}
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-11 w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={isUpdating || dataMode === "demo"}
            aria-busy={isUpdating}
          >
            {isUpdating ? t.employees.savingChanges : t.employees.saveEmployee}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

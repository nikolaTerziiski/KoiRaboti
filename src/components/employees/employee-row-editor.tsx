"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Phone, Wallet } from "lucide-react";
import type { EmployeeActionState } from "@/actions/employees";
import {
  setEmployeeActiveAction,
  updateEmployeeAction,
} from "@/actions/employees";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyDisplay } from "@/components/ui/money-display";
import { SelectField } from "@/components/ui/select-field";
import { useLocale } from "@/lib/i18n/context";
import { formatBgnCurrencyFromEur } from "@/lib/format";
import type { Employee, SnapshotMode } from "@/lib/types";

const initialEmployeeActionState: EmployeeActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  refreshKey: null,
};

type EmployeeRowEditorProps = {
  employee: Employee;
  dataMode: SnapshotMode;
};

function toNumber(value: string) {
  const normalizedValue = value.replace(/,/g, ".").trim();
  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function EmployeeRowEditor({ employee, dataMode }: EmployeeRowEditorProps) {
  const router = useRouter();
  const { t } = useLocale();
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
  const [draft, setDraft] = useState({
    fullName: employee.fullName,
    role: employee.role,
    phoneNumber: employee.phoneNumber ?? "",
    dailyRate: employee.dailyRate.toString(),
  });

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
    toggleState.messageKey === "msgSaveError" ? t.employees.msgSaveError : toggleState.message;

  const roleBadgeClass =
    employee.role === "kitchen"
      ? "border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
      : "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  const roleTintClassName =
    employee.role === "kitchen"
      ? "border-purple-100 bg-purple-50/50 dark:border-purple-900/50 dark:bg-purple-950/20"
      : "border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20";

  return (
    <div className={`rounded-[1.75rem] border p-5 ${roleTintClassName}`}>
      <div className="flex items-start justify-between gap-3">
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
        </div>
        <Badge variant={employee.isActive ? "success" : "outline"}>
          {employee.isActive ? t.employees.active : t.employees.inactive}
        </Badge>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Wallet className="size-4" />
            {t.employees.dailyRateEur}
          </div>
          <MoneyDisplay amount={employee.dailyRate} align="end" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant={isEditing ? "default" : "outline"}
          className="h-11 rounded-2xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
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
      </div>

      {toggleState.status === "error" ? (
        <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {toggleFeedback}
        </div>
      ) : null}

      {isEditing ? (
        <form
          action={updateFormAction}
          className="mt-4 space-y-3 rounded-2xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <input type="hidden" name="employeeId" value={employee.id} />
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
            <p className="text-xs text-muted-foreground">
              {t.employees.bgnView} {formatBgnCurrencyFromEur(toNumber(draft.dailyRate))}
            </p>
          </div>
          {updateState.status !== "idle" ? (
            <div
              className={
                updateState.status === "success"
                  ? "rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"
                  : "rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              }
            >
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

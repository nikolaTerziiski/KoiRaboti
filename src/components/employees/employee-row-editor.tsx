"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
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
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function EmployeeRowEditor({ employee, dataMode }: EmployeeRowEditorProps) {
  const router = useRouter();
  const { locale } = useLocale();
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

  const labels = useMemo(
    () => ({
      role: locale === "bg" ? "Роля" : "Role",
      kitchen: locale === "bg" ? "Кухня" : "Kitchen",
      service: locale === "bg" ? "Сервиз" : "Service",
      dailyRate: locale === "bg" ? "Дневна ставка" : "Daily rate",
      editProfile: locale === "bg" ? "Редактирай профил" : "Edit profile",
      name: locale === "bg" ? "Име" : "Name",
      phone: locale === "bg" ? "Телефон" : "Phone",
      phonePlaceholder: locale === "bg" ? "По желание" : "Optional",
      dailyRateEur: locale === "bg" ? "Дневна ставка (EUR)" : "Daily rate (EUR)",
      bgnView: locale === "bg" ? "BGN:" : "BGN:",
      active: locale === "bg" ? "Активен" : "Active",
      inactive: locale === "bg" ? "Неактивен" : "Inactive",
      save: locale === "bg" ? "Запази профила" : "Save profile",
      saving: locale === "bg" ? "Запазване..." : "Saving...",
      deactivate: locale === "bg" ? "Деактивирай" : "Deactivate",
      reactivate: locale === "bg" ? "Активирай отново" : "Reactivate",
      deactivating: locale === "bg" ? "Деактивиране..." : "Deactivating...",
      reactivating: locale === "bg" ? "Активиране..." : "Reactivating...",
      saveSuccess: locale === "bg" ? "Профилът е обновен." : "Profile updated.",
      saveError:
        locale === "bg"
          ? "Профилът не може да бъде обновен."
          : "Profile could not be updated.",
      duplicatePhone:
        locale === "bg"
          ? "Този телефон вече е използван."
          : "This phone number is already used.",
    }),
    [locale],
  );

  const updateFeedback =
    updateState.messageKey === "msgUpdateSuccess"
      ? labels.saveSuccess
      : updateState.messageKey === "msgDuplicatePhone"
        ? labels.duplicatePhone
        : updateState.messageKey === "msgSaveError"
          ? labels.saveError
          : updateState.message;

  const toggleFeedback =
    toggleState.messageKey === "msgSaveError" ? labels.saveError : toggleState.message;

  const roleBadgeClass =
    employee.role === "kitchen"
      ? "border-purple-200 bg-purple-100 text-purple-700"
      : "border-green-200 bg-green-100 text-green-700";

  return (
    <div className="rounded-2xl border border-border bg-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{employee.fullName}</p>
            <Badge className={roleBadgeClass} variant="outline">
              {employee.role === "kitchen" ? labels.kitchen : labels.service}
            </Badge>
          </div>
          {employee.phoneNumber ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-4" />
              <span>{employee.phoneNumber}</span>
            </div>
          ) : null}
        </div>
        <Badge variant={employee.isActive ? "success" : "outline"}>
          {employee.isActive ? labels.active : labels.inactive}
        </Badge>
      </div>

      <div className="mt-4 rounded-2xl bg-card px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="size-4" />
            {labels.dailyRate}
          </div>
          <MoneyDisplay amount={employee.dailyRate} align="end" />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant={isEditing ? "default" : "outline"}
          className="flex-1"
          onClick={() => setIsEditing((current) => !current)}
        >
          <Pencil className="size-4" />
          {labels.editProfile}
        </Button>
        <form action={toggleFormAction} className="flex-1">
          <input type="hidden" name="employeeId" value={employee.id} />
          <input
            type="hidden"
            name="nextIsActive"
            value={employee.isActive ? "false" : "true"}
          />
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={isToggling || dataMode === "demo"}
            aria-busy={isToggling}
          >
            {isToggling
              ? employee.isActive
                ? labels.deactivating
                : labels.reactivating
              : employee.isActive
                ? labels.deactivate
                : labels.reactivate}
          </Button>
        </form>
      </div>

      {toggleState.status === "error" ? (
        <div className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {toggleFeedback}
        </div>
      ) : null}

      {isEditing ? (
        <form action={updateFormAction} className="mt-4 space-y-3">
          <input type="hidden" name="employeeId" value={employee.id} />
          <div className="space-y-2">
            <Label htmlFor={`employee-name-${employee.id}`}>{labels.name}</Label>
            <Input
              id={`employee-name-${employee.id}`}
              name="fullName"
              value={draft.fullName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, fullName: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`employee-role-${employee.id}`}>{labels.role}</Label>
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
            >
              <option value="service">{labels.service}</option>
              <option value="kitchen">{labels.kitchen}</option>
            </SelectField>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`employee-phone-${employee.id}`}>{labels.phone}</Label>
            <Input
              id={`employee-phone-${employee.id}`}
              name="phoneNumber"
              type="tel"
              placeholder={labels.phonePlaceholder}
              value={draft.phoneNumber}
              onChange={(event) =>
                setDraft((current) => ({ ...current, phoneNumber: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`employee-rate-${employee.id}`}>{labels.dailyRateEur}</Label>
            <Input
              id={`employee-rate-${employee.id}`}
              name="dailyRate"
              inputMode="decimal"
              value={draft.dailyRate}
              onChange={(event) =>
                setDraft((current) => ({ ...current, dailyRate: event.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              {labels.bgnView} {formatBgnCurrencyFromEur(toNumber(draft.dailyRate))}
            </p>
          </div>
          {updateState.status !== "idle" ? (
            <div
              className={
                updateState.status === "success"
                  ? "rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"
                  : "rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              }
            >
              {updateFeedback}
            </div>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={isUpdating || dataMode === "demo"}
            aria-busy={isUpdating}
          >
            {isUpdating ? labels.saving : labels.save}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

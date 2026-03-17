"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import type { EmployeeActionState } from "@/actions/employees";
import {
  setEmployeeActiveAction,
  updateEmployeeAction,
} from "@/actions/employees";

const initialEmployeeActionState: EmployeeActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  refreshKey: null,
};
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyDisplay } from "@/components/ui/money-display";
import { useLocale } from "@/lib/i18n/context";
import { formatBgnCurrencyFromEur } from "@/lib/format";
import type { Employee, SnapshotMode } from "@/lib/types";

type EmployeeRowEditorProps = {
  employee: Employee;
  dataMode: SnapshotMode;
};

function toNumber(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function EmployeeRowEditor({
  employee,
  dataMode,
}: EmployeeRowEditorProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [updateState, updateFormAction, isUpdating] = useActionState(
    updateEmployeeAction,
    initialEmployeeActionState,
  );
  const [toggleState, toggleFormAction, isToggling] = useActionState(
    setEmployeeActiveAction,
    initialEmployeeActionState,
  );
  const refreshRef = useRef<string | null>(null);
  const [draft, setDraft] = useState({
    firstName: employee.firstName,
    lastName: employee.lastName,
    phoneNumber: employee.phoneNumber,
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
    updateState.messageKey ? t.employees[updateState.messageKey] : updateState.message;

  return (
    <div className="rounded-3xl border border-border/70 bg-secondary/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{employee.fullName}</p>
          <p className="text-sm text-muted-foreground">{employee.phoneNumber}</p>
        </div>
        <Badge variant={employee.isActive ? "success" : "outline"}>
          {employee.isActive ? t.employees.active : t.employees.inactive}
        </Badge>
      </div>

      <div className="mt-4 rounded-2xl bg-card px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="size-4" />
            {t.employees.currentRate}
          </div>
          <MoneyDisplay amount={employee.dailyRate} align="end" />
        </div>
      </div>

      <form action={updateFormAction} className="mt-4 space-y-3">
        <input type="hidden" name="employeeId" value={employee.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`employee-firstName-${employee.id}`}>
              {t.employees.firstName}
            </Label>
            <Input
              id={`employee-firstName-${employee.id}`}
              name="firstName"
              value={draft.firstName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, firstName: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`employee-lastName-${employee.id}`}>
              {t.employees.lastName}
            </Label>
            <Input
              id={`employee-lastName-${employee.id}`}
              name="lastName"
              value={draft.lastName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, lastName: event.target.value }))
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`employee-phone-${employee.id}`}>
            {t.employees.phoneNumber}
          </Label>
          <Input
            id={`employee-phone-${employee.id}`}
            name="phoneNumber"
            type="tel"
            value={draft.phoneNumber}
            onChange={(event) =>
              setDraft((current) => ({ ...current, phoneNumber: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`employee-rate-${employee.id}`}>
            {t.employees.dailyRateEur}
          </Label>
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
            {t.employees.bgnView} {formatBgnCurrencyFromEur(toNumber(draft.dailyRate))}
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
          {isUpdating ? t.employees.savingChanges : t.employees.saveEmployee}
        </Button>
      </form>

      <form action={toggleFormAction} className="mt-3">
        <input type="hidden" name="employeeId" value={employee.id} />
        <input
          type="hidden"
          name="nextIsActive"
          value={employee.isActive ? "false" : "true"}
        />
        {toggleState.status === "error" ? (
          <div className="mb-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {toggleState.messageKey
              ? t.employees[toggleState.messageKey]
              : toggleState.message}
          </div>
        ) : null}
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="w-full"
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
  );
}

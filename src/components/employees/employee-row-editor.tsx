"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import {
  initialEmployeeActionState,
  setEmployeeActiveAction,
  updateEmployeeAction,
} from "@/actions/employees";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyDisplay } from "@/components/ui/money-display";
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
    fullName: employee.fullName,
    role: employee.role,
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

  return (
    <div className="rounded-3xl border border-border/70 bg-secondary/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{employee.fullName}</p>
          <p className="text-sm text-muted-foreground">{employee.role}</p>
        </div>
        <Badge variant={employee.isActive ? "success" : "outline"}>
          {employee.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="mt-4 rounded-2xl bg-card px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="size-4" />
            Current rate
          </div>
          <MoneyDisplay amount={employee.dailyRate} align="end" />
        </div>
      </div>

      <form action={updateFormAction} className="mt-4 space-y-3">
        <input type="hidden" name="employeeId" value={employee.id} />
        <div className="space-y-2">
          <Label htmlFor={`employee-name-${employee.id}`}>Name</Label>
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
          <Label htmlFor={`employee-role-${employee.id}`}>Role</Label>
          <Input
            id={`employee-role-${employee.id}`}
            name="role"
            value={draft.role}
            onChange={(event) =>
              setDraft((current) => ({ ...current, role: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`employee-rate-${employee.id}`}>Daily rate (EUR)</Label>
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
            BGN view: {formatBgnCurrencyFromEur(toNumber(draft.dailyRate))}
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
            {updateState.message}
          </div>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          disabled={isUpdating || dataMode === "demo"}
          aria-busy={isUpdating}
        >
          {isUpdating ? "Saving changes..." : "Save employee"}
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
            {toggleState.message}
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
              ? "Deactivating..."
              : "Reactivating..."
            : employee.isActive
              ? "Mark inactive"
              : "Reactivate"}
        </Button>
      </form>
    </div>
  );
}

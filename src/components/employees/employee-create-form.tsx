"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { EmployeeActionState } from "@/actions/employees";
import { createEmployeeAction } from "@/actions/employees";
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
import { useLocale } from "@/lib/i18n/context";
import { formatBgnCurrencyFromEur } from "@/lib/format";
import type { SnapshotMode } from "@/lib/types";

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

function createInitialDraft() {
  return {
    fullName: "",
    role: "service" as "kitchen" | "service",
    phoneNumber: "",
    dailyRate: "",
  };
}

function toNumber(value: string) {
  const normalizedValue = value.replace(/,/g, ".").trim();
  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function EmployeeCreateForm({
  dataMode,
  onSuccess,
}: EmployeeCreateFormProps) {
  const router = useRouter();
  const { t } = useLocale();
  const refreshedKeyRef = useRef<string | null>(null);
  const [actionState, formAction, isPending] = useActionState(
    createEmployeeAction,
    initialEmployeeActionState,
  );
  const [draft, setDraft] = useState(createInitialDraft);

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

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { EmployeeActionState } from "@/actions/employees";
import { createEmployeeAction } from "@/actions/employees";

const initialEmployeeActionState: EmployeeActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  refreshKey: null,
};
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/context";
import { formatBgnCurrencyFromEur } from "@/lib/format";
import type { SnapshotMode } from "@/lib/types";

type EmployeeCreateFormProps = {
  dataMode: SnapshotMode;
};

function toNumber(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function EmployeeCreateForm({ dataMode }: EmployeeCreateFormProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [actionState, formAction, isPending] = useActionState(
    createEmployeeAction,
    initialEmployeeActionState,
  );
  const refreshedKeyRef = useRef<string | null>(null);
  const [draft, setDraft] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    dailyRate: "",
  });

  useEffect(() => {
    if (
      actionState.status === "success" &&
      actionState.refreshKey &&
      refreshedKeyRef.current !== actionState.refreshKey
    ) {
      refreshedKeyRef.current = actionState.refreshKey;
      router.refresh();
    }
  }, [actionState, router]);

  const feedbackMessage =
    actionState.messageKey ? t.employees[actionState.messageKey] : actionState.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.employees.addEmployee}</CardTitle>
        <CardDescription>{t.employees.addEmployeeDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-firstName">{t.employees.firstName}</Label>
              <Input
                id="create-firstName"
                name="firstName"
                value={draft.firstName}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, firstName: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-lastName">{t.employees.lastName}</Label>
              <Input
                id="create-lastName"
                name="lastName"
                value={draft.lastName}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, lastName: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-phoneNumber">{t.employees.phoneNumber}</Label>
            <Input
              id="create-phoneNumber"
              name="phoneNumber"
              type="tel"
              value={draft.phoneNumber}
              onChange={(event) =>
                setDraft((current) => ({ ...current, phoneNumber: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-dailyRate">{t.employees.dailyRateEur}</Label>
            <Input
              id="create-dailyRate"
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
          {actionState.status !== "idle" ? (
            <div
              className={
                actionState.status === "success"
                  ? "rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"
                  : "rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              }
            >
              {feedbackMessage}
            </div>
          ) : null}
          {dataMode === "demo" ? (
            <div className="rounded-2xl border border-border bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
              {t.employees.demoNote}
            </div>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || dataMode === "demo"}
            aria-busy={isPending}
          >
            <Plus className="size-4" />
            {isPending ? t.employees.savingEmployee : t.employees.addToRoster}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

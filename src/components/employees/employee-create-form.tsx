"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  createEmployeeAction,
  initialEmployeeActionState,
} from "@/actions/employees";
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
    fullName: "",
    role: "",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.employees.addEmployee}</CardTitle>
        <CardDescription>{t.employees.addEmployeeDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-fullName">{t.employees.fullName}</Label>
            <Input
              id="create-fullName"
              name="fullName"
              value={draft.fullName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, fullName: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-role">{t.employees.role}</Label>
            <Input
              id="create-role"
              name="role"
              value={draft.role}
              onChange={(event) =>
                setDraft((current) => ({ ...current, role: event.target.value }))
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
              {actionState.message}
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

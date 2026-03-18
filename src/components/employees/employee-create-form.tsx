"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { EmployeeActionState } from "@/actions/employees";
import { createEmployeeAction } from "@/actions/employees";
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

const initialEmployeeActionState: EmployeeActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  refreshKey: null,
};

type EmployeeCreateFormProps = {
  dataMode: SnapshotMode;
};

function toNumber(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function EmployeeCreateForm({ dataMode }: EmployeeCreateFormProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const refreshedKeyRef = useRef<string | null>(null);
  const [actionState, formAction, isPending] = useActionState(
    createEmployeeAction,
    initialEmployeeActionState,
  );
  const [draft, setDraft] = useState({
    fullName: "",
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

  const labels = useMemo(
    () => ({
      title: locale === "bg" ? "Добави служител" : "Add employee",
      description:
        locale === "bg"
          ? "Минимална форма за име, телефон и дневна ставка."
          : "A minimal form for name, phone, and daily rate.",
      fullName: locale === "bg" ? "Име" : "Name",
      phone: locale === "bg" ? "Телефон" : "Phone",
      phonePlaceholder:
        locale === "bg" ? "По желание" : "Optional",
      dailyRate: locale === "bg" ? "Дневна ставка (EUR)" : "Daily rate (EUR)",
      bgnView: locale === "bg" ? "BGN:" : "BGN:",
      demoNote:
        locale === "bg"
          ? "В демо режим формата е видима, но записването е изключено."
          : "In demo mode the form stays visible, but saving is disabled.",
      saving: locale === "bg" ? "Запазване..." : "Saving...",
      add: locale === "bg" ? "Добави" : "Add",
      saveError:
        locale === "bg"
          ? "Запазването е неуспешно."
          : "Saving failed.",
      saveSuccess:
        locale === "bg"
          ? "Служителят е добавен."
          : "Employee added.",
      duplicatePhone:
        locale === "bg"
          ? "Този телефон вече е използван."
          : "This phone number is already used.",
    }),
    [locale],
  );

  const feedbackMessage =
    actionState.messageKey === "msgCreateSuccess"
      ? labels.saveSuccess
      : actionState.messageKey === "msgDuplicatePhone"
        ? labels.duplicatePhone
        : actionState.messageKey === "msgSaveError"
          ? labels.saveError
          : actionState.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-fullName">{labels.fullName}</Label>
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
            <Label htmlFor="create-phoneNumber">{labels.phone}</Label>
            <Input
              id="create-phoneNumber"
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
            <Label htmlFor="create-dailyRate">{labels.dailyRate}</Label>
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
              {labels.bgnView} {formatBgnCurrencyFromEur(toNumber(draft.dailyRate))}
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
              {labels.demoNote}
            </div>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || dataMode === "demo"}
            aria-busy={isPending}
          >
            <Plus className="size-4" />
            {isPending ? labels.saving : labels.add}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

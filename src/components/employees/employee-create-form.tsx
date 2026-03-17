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
        <CardTitle>Add employee</CardTitle>
        <CardDescription>
          Save the roster directly to Supabase. Demo mode keeps the form visible but disabled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-fullName">Full name</Label>
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
            <Label htmlFor="create-role">Role</Label>
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
            <Label htmlFor="create-dailyRate">Daily rate (EUR)</Label>
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
              BGN view: {formatBgnCurrencyFromEur(toNumber(draft.dailyRate))}
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
              Demo mode does not persist employee changes. Configure Supabase to enable save.
            </div>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || dataMode === "demo"}
            aria-busy={isPending}
          >
            <Plus className="size-4" />
            {isPending ? "Saving employee..." : "Add to roster"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

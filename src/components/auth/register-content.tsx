"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
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
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { useLocale } from "@/lib/i18n/context";
import { DEFAULT_MANUAL_EXPENSE_EUR, formatBgnCurrencyFromEur } from "@/lib/format";
import type { RegisterActionState } from "@/actions/auth";
import { registerAction } from "@/actions/auth";

const initialRegisterActionState: RegisterActionState = {
  status: "idle",
  messageKey: null,
  message: null,
};

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

type RegisterContentProps = {
  hasSupabase: boolean;
};

export function RegisterContent({ hasSupabase }: RegisterContentProps) {
  const { t } = useLocale();
  const [actionState, formAction, isPending] = useActionState(
    registerAction,
    initialRegisterActionState,
  );
  const [defaultExpense, setDefaultExpense] = useState(
    String(DEFAULT_MANUAL_EXPENSE_EUR),
  );

  // Show the translated message for known client-side errors (e.g. password mismatch),
  // but show the raw server message for "msgError" so Supabase errors are visible.
  const errorMessage =
    actionState.messageKey === "passwordMismatch"
      ? t.register.passwordMismatch
      : actionState.message;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-4 flex justify-end">
        <LocaleSwitcher />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.register.title}</CardTitle>
          <CardDescription>{t.register.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSupabase ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {t.register.noSupabase}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {t.register.alreadyHaveAccount}{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t.register.signIn}
                </Link>
              </p>
            </div>
          ) : (
            <>
              <form action={formAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurantName">{t.register.restaurantName}</Label>
                  <Input
                    id="restaurantName"
                    name="restaurantName"
                    required
                    autoComplete="organization"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminFullName">{t.register.adminFullName}</Label>
                  <Input
                    id="adminFullName"
                    name="adminFullName"
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t.register.email}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t.register.password}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t.register.confirmPassword}</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultDailyExpense">
                    {t.register.defaultExpenseEur}
                  </Label>
                  <Input
                    id="defaultDailyExpense"
                    name="defaultDailyExpense"
                    inputMode="decimal"
                    value={defaultExpense}
                    onChange={(e) => setDefaultExpense(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.register.bgnView}{" "}
                    {formatBgnCurrencyFromEur(toNumber(defaultExpense))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.register.defaultExpenseDesc}
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
                    {errorMessage}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending}
                  aria-busy={isPending}
                >
                  {isPending ? t.register.creating : t.register.create}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                {t.register.alreadyHaveAccount}{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t.register.signIn}
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

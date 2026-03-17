"use client";

import { useActionState } from "react";
import type { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/context";

const initialState = {
  error: null,
};

type LoginFormProps = {
  action: typeof loginAction;
  usesSupabase: boolean;
};

export function LoginForm({ action, usesSupabase }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const { t } = useLocale();

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t.loginForm.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="owner@restaurant.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t.loginForm.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={
            usesSupabase
              ? t.loginForm.passwordPlaceholder
              : t.loginForm.passwordDemoPlaceholder
          }
          autoComplete="current-password"
          required
        />
      </div>
      {state.error ? (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending
          ? t.loginForm.signingIn
          : usesSupabase
            ? t.loginForm.signIn
            : t.loginForm.continueDemo}
      </Button>
    </form>
  );
}

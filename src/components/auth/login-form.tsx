"use client";

import { useActionState } from "react";
import type { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = {
  error: null,
};

type LoginFormProps = {
  action: typeof loginAction;
  usesSupabase: boolean;
};

export function LoginForm({ action, usesSupabase }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={usesSupabase ? "Enter your password" : "Any password works in demo mode"}
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
        {isPending ? "Signing in..." : usesSupabase ? "Sign in" : "Continue in demo mode"}
      </Button>
    </form>
  );
}

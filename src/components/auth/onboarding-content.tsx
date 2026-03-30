"use client";

import { useActionState } from "react";
import { Leaf } from "lucide-react";
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
import type { OnboardingActionState } from "@/actions/auth";
import { onboardingAction } from "@/actions/auth";

const initialState: OnboardingActionState = {
  status: "idle",
  message: null,
};

export function OnboardingContent() {
  const { t } = useLocale();
  const [actionState, formAction, isPending] = useActionState(
    onboardingAction,
    initialState,
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-6 flex justify-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Leaf className="size-7" />
        </div>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t.onboarding.title}</CardTitle>
          <CardDescription>{t.onboarding.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t.onboarding.fullName}</Label>
              <Input
                id="fullName"
                name="fullName"
                required
                autoComplete="name"
                placeholder={t.onboarding.fullNamePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">{t.onboarding.businessName}</Label>
              <Input
                id="businessName"
                name="businessName"
                required
                autoComplete="organization"
                placeholder={t.onboarding.businessNamePlaceholder}
              />
              <p className="text-xs text-muted-foreground">
                {t.onboarding.businessHint}
              </p>
            </div>

            {actionState.status === "error" ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {actionState.message}
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? t.onboarding.submitting : t.onboarding.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

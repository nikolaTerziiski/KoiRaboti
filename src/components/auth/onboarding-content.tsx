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
  const { locale } = useLocale();
  const [actionState, formAction, isPending] = useActionState(
    onboardingAction,
    initialState,
  );

  const labels = {
    title: locale === "bg" ? "Добре дошъл!" : "Welcome!",
    subtitle:
      locale === "bg"
        ? "Кажи ни малко за себе си, за да настроим приложението."
        : "Tell us a bit about yourself so we can set things up.",
    fullName: locale === "bg" ? "Как се казваш?" : "What's your name?",
    fullNamePlaceholder: locale === "bg" ? "Иван Иванов" : "John Smith",
    businessName: locale === "bg" ? "Име на бизнеса" : "Business name",
    businessNamePlaceholder:
      locale === "bg" ? "Ресторант Златното пиле" : "My Restaurant",
    businessHint:
      locale === "bg"
        ? "Можеш да го промениш по-късно от настройките."
        : "You can change this later in settings.",
    submit: locale === "bg" ? "Започни" : "Get started",
    submitting: locale === "bg" ? "Настройване..." : "Setting up...",
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-6 flex justify-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Leaf className="size-7" />
        </div>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{labels.title}</CardTitle>
          <CardDescription>{labels.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{labels.fullName}</Label>
              <Input
                id="fullName"
                name="fullName"
                required
                autoComplete="name"
                placeholder={labels.fullNamePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">{labels.businessName}</Label>
              <Input
                id="businessName"
                name="businessName"
                required
                autoComplete="organization"
                placeholder={labels.businessNamePlaceholder}
              />
              <p className="text-xs text-muted-foreground">
                {labels.businessHint}
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
              {isPending ? labels.submitting : labels.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/context";
import type { OnboardingActionState } from "@/actions/auth";
import { onboardingAction } from "@/actions/auth";

const initialState: OnboardingActionState = {
  status: "idle",
  message: null,
};

const STEPS = ["Профил", "Ресторант"];

export function OnboardingContent() {
  const { t } = useLocale();
  const [actionState, formAction, isPending] = useActionState(
    onboardingAction,
    initialState,
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#f7f4ee] font-['DM_Sans',system-ui,sans-serif]">
      <div className="w-full max-w-[420px]">
        {/* Logo mark */}
        <div className="flex items-center gap-2.5 mb-10">
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <path
              d="M14 3C8 3 4 8 4 14c0 2.5.8 4.8 2.2 6.6L20.6 6.2A10 10 0 0 0 14 3Z"
              fill="#22c55e"
              opacity=".9"
            />
            <path
              d="M20.6 6.2 6.2 20.6A10 10 0 0 0 24 14c0-2.9-1.2-5.5-3.4-7.8Z"
              fill="#16a34a"
            />
          </svg>
          <span className="text-xs font-semibold tracking-[0.22em] uppercase text-[#16a34a]">
            КоиРаботи
          </span>
        </div>

        {/* Step pills */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                  i === 0
                    ? "bg-green-500/10 text-green-700 border-green-500/20"
                    : "bg-black/[0.04] text-gray-400 border-black/[0.06]"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    i === 0
                      ? "bg-[#16a34a] text-white"
                      : "bg-black/[0.08] text-gray-400"
                  }`}
                >
                  {i + 1}
                </span>
                {step}
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-6 h-px bg-black/10" />
              )}
            </div>
          ))}
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-['DM_Serif_Display',Georgia,serif] text-[2rem] text-[#0f1a12] tracking-[-0.02em] leading-[1.15]">
            {t.onboarding.title}
          </h1>
          <p className="mt-2 text-sm text-[#6b7280]">
            {t.onboarding.subtitle}
          </p>
        </div>

        {/* Form */}
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="fullName"
              className="text-xs font-semibold uppercase tracking-widest text-[#374151]"
            >
              {t.onboarding.fullName}
            </Label>
            <Input
              id="fullName"
              name="fullName"
              required
              autoComplete="name"
              placeholder={t.onboarding.fullNamePlaceholder}
              className="h-12 rounded-xl border-0 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-green-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="businessName"
              className="text-xs font-semibold uppercase tracking-widest text-[#374151]"
            >
              {t.onboarding.businessName}
            </Label>
            <Input
              id="businessName"
              name="businessName"
              required
              autoComplete="organization"
              placeholder={t.onboarding.businessNamePlaceholder}
              className="h-12 rounded-xl border-0 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-green-500"
            />
            <p className="text-xs text-[#9ca3af]">
              {t.onboarding.businessHint}
            </p>
          </div>

          {actionState.status === "error" && (
            <div className="rounded-xl px-4 py-3 text-sm bg-red-600/[0.06] text-[#b91c1c] border border-red-600/[0.15]">
              {actionState.message}
            </div>
          )}

          <Button
            type="submit"
            className={`w-full h-12 rounded-xl font-semibold text-sm tracking-wide text-white border-none mt-2 ${
              isPending ? "bg-[#15803d]" : "bg-[#16a34a]"
            }`}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? t.onboarding.submitting : t.onboarding.submit}
          </Button>
        </form>
      </div>
    </div>
  );
}

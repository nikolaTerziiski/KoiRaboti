"use client";

import { useActionState, useState } from "react";
import type { OnboardingActionState } from "@/actions/auth";
import { onboardingAction } from "@/actions/auth";
import { PayrollCadenceFields } from "@/components/payroll/payroll-cadence-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/context";
import { createDefaultPayrollCadenceDraft } from "@/lib/payroll-settings";

const initialState: OnboardingActionState = {
  status: "idle",
  message: null,
};

export function OnboardingContent() {
  const { t, locale } = useLocale();
  const [actionState, formAction, isPending] = useActionState(
    onboardingAction,
    initialState,
  );
  const [payrollDraft, setPayrollDraft] = useState(createDefaultPayrollCadenceDraft);
  const copy =
    locale === "bg"
      ? {
          steps: ["Профил", "Ресторант", "Payroll"],
          payrollTitle: "Как обикновено плащате на персонала?",
          payrollDesc:
            "Това става ресторантският график по подразбиране. После всеки служител може да го наследява или да има свой override.",
        }
      : {
          steps: ["Profile", "Business", "Payroll"],
          payrollTitle: "How do you usually pay staff?",
          payrollDesc:
            "This becomes the restaurant default schedule. Later each employee can inherit it or use a custom override.",
        };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-12 font-['DM_Sans',system-ui,sans-serif]">
      <div className="w-full max-w-[460px]">
        <div className="mb-10 flex items-center gap-2.5">
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
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#16a34a]">
            KoiRaboti
          </span>
        </div>

        <div className="mb-8 flex items-center gap-2">
          {copy.steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  index === 0
                    ? "border-green-500/20 bg-green-500/10 text-green-700"
                    : "border-black/[0.06] bg-black/[0.04] text-gray-400"
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                    index === 0
                      ? "bg-[#16a34a] text-white"
                      : "bg-black/[0.08] text-gray-400"
                  }`}
                >
                  {index + 1}
                </span>
                {step}
              </div>
              {index < copy.steps.length - 1 ? <div className="h-px w-6 bg-black/10" /> : null}
            </div>
          ))}
        </div>

        <div className="mb-8">
          <h1 className="font-['DM_Serif_Display',Georgia,serif] text-[2rem] leading-[1.15] tracking-[-0.02em] text-[#0f1a12]">
            {t.onboarding.title}
          </h1>
          <p className="mt-2 text-sm text-[#6b7280]">{t.onboarding.subtitle}</p>
        </div>

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
            <p className="text-xs text-[#9ca3af]">{t.onboarding.businessHint}</p>
          </div>

          <PayrollCadenceFields
            idPrefix="onboarding-default-payroll"
            title={copy.payrollTitle}
            description={copy.payrollDesc}
            value={payrollDraft}
            onChange={(field, nextValue) =>
              setPayrollDraft((current) => ({
                ...current,
                [field]: nextValue,
              }))
            }
            fieldNames={{
              cadence: "defaultPayrollCadence",
              weeklyPayday: "defaultWeeklyPayday",
              monthlyPayDay: "defaultMonthlyPayDay",
              twiceMonthlyDay1: "defaultTwiceMonthlyDay1",
              twiceMonthlyDay2: "defaultTwiceMonthlyDay2",
            }}
          />

          {actionState.status === "error" ? (
            <div className="rounded-xl border border-red-600/[0.15] bg-red-600/[0.06] px-4 py-3 text-sm text-[#b91c1c]">
              {actionState.message}
            </div>
          ) : null}

          <Button
            type="submit"
            className={`mt-2 h-12 w-full rounded-xl border-none text-sm font-semibold tracking-wide text-white ${
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

"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { useLocale } from "@/lib/i18n/context";
import type { RegisterActionState } from "@/actions/auth";
import { registerAction } from "@/actions/auth";

const initialRegisterActionState: RegisterActionState = {
  status: "idle",
  messageKey: null,
  message: null,
};

type RegisterContentProps = {
  hasSupabase: boolean;
};

export function RegisterContent({ hasSupabase }: RegisterContentProps) {
  const { t } = useLocale();
  const [showPassword, setShowPassword] = useState(false);
  const [actionState, formAction, isPending] = useActionState(
    registerAction,
    initialRegisterActionState,
  );

  const errorMessage =
    actionState.messageKey === "passwordMismatch"
      ? t.register.passwordMismatch
      : actionState.message;

  return (
    <div className="min-h-screen w-full flex font-['DM_Sans',system-ui,sans-serif]">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] flex-col justify-between relative overflow-hidden bg-[#0f1a12]">
        {/* Grain */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20512%20512%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.9%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23n)%27%20opacity=%271%27/%3E%3C/svg%3E')]"
        />
        {/* Glow */}
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(34,197,94,0.07)_0%,transparent_70%)]" />

        <div className="relative z-10 px-10 pt-10 flex items-center gap-3">
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
          <span className="text-xs font-semibold tracking-[0.22em] uppercase text-[#22c55e]">
            КоиРаботи
          </span>
        </div>

        <div className="relative z-10 px-10 xl:px-14">
          <p className="text-xs font-medium tracking-[0.28em] uppercase mb-5 text-white/30">
            Нова смеска
          </p>
          <h2 className="font-['DM_Serif_Display',Georgia,serif] text-[clamp(2rem,3.5vw,3rem)] text-[#f5f0e8] tracking-[-0.02em] leading-[1.15]">
            Започни
            <br />
            <em className="italic text-[#f5f0e8]/50">за минути.</em>
          </h2>

          <p className="mt-6 text-sm leading-relaxed max-w-xs text-white/35">
            Създай акаунт, добави ресторанта си и започни да следиш дневния
            оборот, смените и разходите.
          </p>
        </div>

        <div className="relative z-10 px-10 pb-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/[0.07]" />
          <p className="text-xs text-white/[0.18]">v2 · 2026</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col min-h-screen bg-[#f7f4ee]">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-6 pt-6 lg:hidden">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
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
            <span className="text-xs font-semibold tracking-widest uppercase text-[#16a34a]">
              КоиРаботи
            </span>
          </div>
          <LocaleSwitcher />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[380px]">
            <div className="hidden lg:flex justify-end mb-8">
              <LocaleSwitcher />
            </div>

            <div className="mb-8">
              <h2 className="mb-1.5 font-['DM_Serif_Display',Georgia,serif] text-[1.9rem] text-[#0f1a12] tracking-[-0.02em] leading-[1.15]">
                {t.register.title}
              </h2>
              <p className="text-sm text-[#6b7280]">{t.register.subtitle}</p>
            </div>

            {/* Unavailable state (no Supabase) */}
            {!hasSupabase ? (
              <div className="space-y-4">
                <div className="rounded-xl px-4 py-3 text-sm bg-red-600/[0.06] text-[#b91c1c] border border-red-600/[0.15]">
                  {t.register.unavailable}
                </div>
                <p className="text-center text-sm text-[#9ca3af]">
                  {t.register.alreadyHaveAccount}{" "}
                  <Link
                    href="/login"
                    className="font-semibold underline-offset-2 hover:underline text-[#16a34a]"
                  >
                    {t.register.signIn}
                  </Link>
                </p>
              </div>
            ) : (
              <>
                {/* Form */}
                <form action={formAction} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email"
                      className="text-xs font-semibold uppercase tracking-widest text-[#374151]"
                    >
                      {t.register.email}
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="h-12 rounded-xl border-0 bg-white shadow-sm text-[#0f1a12] focus-visible:ring-2 focus-visible:ring-green-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="password"
                      className="text-xs font-semibold uppercase tracking-widest text-[#374151]"
                    >
                      {t.register.password}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="h-12 rounded-xl border-0 bg-white shadow-sm pr-11 focus-visible:ring-2 focus-visible:ring-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#374151] transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-5" />
                        ) : (
                          <Eye className="size-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-[#9ca3af]">
                      {t.register.passwordHint}
                    </p>
                  </div>

                  {actionState.status !== "idle" && (
                    <div
                      className={`rounded-xl px-4 py-3 text-sm border ${
                        actionState.status === "success"
                          ? "bg-green-500/[0.07] text-[#15803d] border-green-500/[0.15]"
                          : "bg-red-600/[0.06] text-[#b91c1c] border-red-600/[0.15]"
                      }`}
                    >
                      {errorMessage}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className={`w-full h-12 rounded-xl font-semibold text-sm tracking-wide text-white border-none transition-all ${
                      isPending ? "bg-[#15803d]" : "bg-[#16a34a]"
                    }`}
                    disabled={isPending}
                    aria-busy={isPending}
                  >
                    {isPending ? t.register.creating : t.register.create}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-[#9ca3af]">
                  {t.register.alreadyHaveAccount}{" "}
                  <Link
                    href="/login"
                    className="font-semibold underline-offset-2 hover:underline text-[#16a34a]"
                  >
                    {t.register.signIn}
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import type { loginAction } from "@/actions/auth";
import { LoginForm } from "@/components/auth/login-form";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { useLocale } from "@/lib/i18n/context";

const features = [
  { num: "01", label: "Ежедневни отчети", sub: "Оборот, печалба и каси на едно място" },
  { num: "02", label: "Присъствие & заплати", sub: "Смени, аванси и гъвкави разплащания" },
  { num: "03", label: "Telegram разходи", sub: "Снимай касовата бележка, ботът се оправя" },
];

type LoginContentProps = {
  action: typeof loginAction;
  usesSupabase: boolean;
};

export function LoginContent({ action, usesSupabase }: LoginContentProps) {
  const { t } = useLocale();

  return (
    <div className="min-h-screen w-full flex font-['DM_Sans',system-ui,sans-serif]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between relative overflow-hidden bg-[#0f1a12]">
        {/* Subtle grain overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20512%20512%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.9%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23n)%27%20opacity=%271%27/%3E%3C/svg%3E')]"
        />

        {/* Decorative circle */}
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(34,197,94,0.08)_0%,transparent_70%)]" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-10 pt-10">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
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
            <span className="text-sm font-semibold tracking-[0.22em] uppercase text-[#22c55e]">
              КоиРаботи
            </span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 px-10 xl:px-14">
          <p className="text-xs font-medium tracking-[0.3em] uppercase mb-6 text-white/35">
            Управление на ресторант
          </p>
          <h1 className="leading-none mb-8 font-['DM_Serif_Display',Georgia,serif] text-[clamp(2.6rem,4.5vw,3.8rem)] text-[#f5f0e8] tracking-[-0.02em]">
            Всичко важно
            <br />
            <span className="text-[#22c55e]">за деня,</span>
            <br />
            <em className="italic text-[#f5f0e8]/60">на едно място.</em>
          </h1>

          <div className="space-y-5 max-w-sm">
            {features.map((f) => (
              <div key={f.num} className="flex items-start gap-4">
                <span className="text-[11px] font-semibold tabular-nums mt-0.5 shrink-0 text-[#22c55e] tracking-[0.1em]">
                  {f.num}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#f5f0e8]/90">
                    {f.label}
                  </p>
                  <p className="text-xs mt-0.5 text-[#f5f0e8]/[0.38]">
                    {f.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom rule */}
        <div className="relative z-10 px-10 pb-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/[0.08]" />
          <p className="text-xs text-white/20">v2 · 2026</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-h-screen bg-[#f7f4ee]">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-6 pt-6 lg:hidden">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
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

        {/* Form centred */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[380px]">
            {/* Desktop locale switcher */}
            <div className="hidden lg:flex justify-end mb-8">
              <LocaleSwitcher />
            </div>

            <div className="mb-9">
              <h2 className="mb-1.5 font-['DM_Serif_Display',Georgia,serif] text-[2rem] text-[#0f1a12] tracking-[-0.02em] leading-[1.15]">
                {t.login.signIn}
              </h2>
              <p className="text-sm text-[#6b7280]">
                {usesSupabase
                  ? t.login.credentialsSupabase
                  : t.login.credentialsDemo}
              </p>
            </div>

            {/* Form */}
            <LoginForm action={action} usesSupabase={usesSupabase} />

            {/* Hint */}
            <div className="mt-5 rounded-xl px-4 py-3 text-xs bg-green-500/[0.07] text-[#15803d] border border-green-500/[0.15]">
              {t.login.redirectNote}
            </div>

            {/* Register link */}
            <p className="mt-6 text-center text-sm text-[#9ca3af]">
              {t.login.noAccount}{" "}
              <Link
                href="/register"
                className="font-semibold underline-offset-2 hover:underline transition-colors text-[#16a34a]"
              >
                {t.login.register}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

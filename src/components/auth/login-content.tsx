"use client";

import Link from "next/link";
import { CalendarDays, Leaf, ReceiptText, WalletCards } from "lucide-react";
import type { loginAction } from "@/actions/auth";
import { LoginForm } from "@/components/auth/login-form";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { useLocale } from "@/lib/i18n/context";

const highlightIcons = [CalendarDays, WalletCards, ReceiptText] as const;

type LoginContentProps = {
  action: typeof loginAction;
  usesSupabase: boolean;
};

export function LoginContent({ action, usesSupabase }: LoginContentProps) {
  const { t } = useLocale();
  const highlightItems = [
    t.login.highlights.attendance,
    t.login.highlights.dailyNumbers,
    t.login.highlights.green,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background text-foreground">
      <header className="border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="KoiRaboti home">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Leaf className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                {t.login.title}
              </p>
              <p className="text-sm text-muted-foreground">{t.shell.subtitle}</p>
            </div>
          </Link>

          <LocaleSwitcher />
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-81px)] w-full max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:px-8 lg:py-12">
        <section className="order-2 space-y-6 lg:order-1">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              {t.login.signIn}
            </span>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {t.login.subtitle}
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                {t.login.redirectNote}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {highlightItems.map((item, index) => {
              const Icon = highlightIcons[index];

              return (
                <article
                  key={item.title}
                  className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="order-1 rounded-[1.75rem] border border-border bg-card p-6 shadow-lg lg:order-2 lg:p-7">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {t.login.signIn}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {usesSupabase ? t.login.credentialsSupabase : t.login.credentialsDemo}
            </p>
          </div>

          <div className="mt-6">
            <LoginForm action={action} usesSupabase={usesSupabase} />
          </div>

          <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm leading-6 text-muted-foreground">
            {t.login.redirectNote}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t.login.noAccount}{" "}
            <Link
              href="/register"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t.login.register}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

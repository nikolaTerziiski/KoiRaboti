"use client";

import Link from "next/link";
import { ClipboardList, Leaf, Wallet } from "lucide-react";
import type { loginAction } from "@/actions/auth";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { useLocale } from "@/lib/i18n/context";

type LoginContentProps = {
  action: typeof loginAction;
  usesSupabase: boolean;
};

export function LoginContent({ action, usesSupabase }: LoginContentProps) {
  const { locale, t } = useLocale();
  const credentialsText =
    usesSupabase
      ? locale === "bg"
        ? "Влез с администраторските си данни."
        : "Use your admin credentials."
      : locale === "bg"
        ? "Можеш да продължиш в демо режим с произволен имейл и парола."
        : "You can continue in demo mode with any email and password.";

  const highlights = [
    {
      key: "attendance",
      title: t.login.highlights.attendance.title,
      description: t.login.highlights.attendance.description,
      icon: ClipboardList,
    },
    {
      key: "dailyNumbers",
      title: t.login.highlights.dailyNumbers.title,
      description: t.login.highlights.dailyNumbers.description,
      icon: Wallet,
    },
    {
      key: "green",
      title: t.login.highlights.green.title,
      description: t.login.highlights.green.description,
      icon: Leaf,
    },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8 sm:max-w-4xl sm:px-6">
      <div className="mb-4 flex justify-end">
        <LocaleSwitcher />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
        <Card className="hidden bg-gradient-to-br from-primary to-green-800 text-primary-foreground sm:block">
          <CardHeader>
            <CardTitle className="text-3xl">{t.login.title}</CardTitle>
            <CardDescription className="max-w-sm text-primary-foreground/80">
              {t.login.subtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.key}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-white/15">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-primary-foreground/80">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.login.signIn}</CardTitle>
            <CardDescription>{credentialsText}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoginForm action={action} usesSupabase={usesSupabase} />
            <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              {t.login.redirectNote}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {t.login.noAccount}{" "}
              <Link
                href="/register"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t.login.register}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarClock,
  FileText,
  Leaf,
  LogOut,
  UserRound,
  Users,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type AppPageKey = "today" | "employees" | "payroll" | "reports" | "profile";

type AppShellProps = {
  pageKey: AppPageKey;
  sessionMode: "supabase" | "demo";
  dataMode: "supabase" | "demo" | "error";
  children: ReactNode;
};

export function AppShell({ pageKey, sessionMode, dataMode, children }: AppShellProps) {
<<<<<<< HEAD
  const pathname = usePathname();
  const { locale, t } = useLocale();
  const profileLabel = locale === "bg" ? "Профил" : "Profile";

  const page =
    pageKey === "profile"
      ? {
          title: profileLabel,
          description:
            locale === "bg"
              ? "Месечни статистики и разход за заплати."
              : "Monthly statistics and labor cost summary.",
        }
      : t.pages[pageKey as keyof typeof t.pages];
=======
  const { t } = useLocale();
  const page = t.pages[pageKey];
>>>>>>> 8e0795b99140a08092cc6027cd5ad331ab5f6dd4

  const sessionLabel = sessionMode === "supabase" ? t.shell.sessionActive : t.shell.sessionDemo;
  const dataLabel =
    dataMode === "error"
      ? t.shell.dataUnavailable
      : dataMode === "supabase"
        ? t.shell.dataLive
        : t.shell.dataDemo;

  const navItems = [
    { href: "/today", label: t.nav.today, icon: CalendarClock },
    { href: "/employees", label: t.nav.employees, icon: Users },
    { href: "/payroll", label: t.nav.payroll, icon: BarChart3 },
    { href: "/reports", label: t.nav.reports, icon: FileText },
    { href: "/profile", label: profileLabel, icon: UserRound },
  ];

  return (
    <div className="min-h-screen lg:flex">
      {/* ── Desktop sidebar (lg+) ── */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-border lg:bg-card">
        <div className="flex flex-1 flex-col gap-6 p-4">
          <Link href="/today" className="flex items-center gap-2 px-2 py-1">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Leaf className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                KoiRaboti
              </p>
              <p className="text-[11px] text-muted-foreground">{t.shell.subtitle}</p>
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-3 border-t border-border pt-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="success">{sessionLabel}</Badge>
              <Badge variant="outline">{dataLabel}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <LocaleSwitcher />
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  <LogOut className="size-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 lg:pl-60">
        <div
          className="mx-auto w-full max-w-md px-4 pt-5 sm:max-w-3xl sm:px-6 lg:pb-8"
          style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
        >
          {/* Mobile header card */}
          <header className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                {/* Logo — mobile only (sidebar has it on desktop) */}
                <Link href="/today" className="inline-flex items-center gap-2 lg:hidden">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Leaf className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                      KoiRaboti
                    </p>
                    <p className="text-sm text-muted-foreground">{t.shell.subtitle}</p>
                  </div>
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    {page.description}
                  </p>
                </div>
              </div>
              {/* Controls — mobile only */}
              <div className="flex flex-col items-end gap-1 lg:hidden">
                <LocaleSwitcher />
                <form action={logoutAction}>
                  <Button type="submit" variant="ghost" size="sm">
                    <LogOut className="size-4" />
                    {t.shell.logOut}
                  </Button>
                </form>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              <Badge variant="success">{sessionLabel}</Badge>
              <Badge variant="outline">{dataLabel}</Badge>
            </div>
          </header>

          <main className="mt-5 flex-1">{children}</main>
        </div>
      </div>

      {/* Mobile-only bottom nav */}
      <MobileNav />
    </div>
  );
}

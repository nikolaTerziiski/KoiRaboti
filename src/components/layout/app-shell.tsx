"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BarChart3,
  CalendarDays,
  Leaf,
  LogOut,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { MobileNav, type MobileNavItem } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type AppPageKey =
  | "today"
  | "transactions"
  | "employees"
  | "payroll"
  | "reports"
  | "profile";

type AppShellProps = {
  pageKey: AppPageKey;
  sessionMode: "supabase" | "demo";
  dataMode: "supabase" | "demo" | "error";
  children: ReactNode;
  hidePageHeader?: boolean;
  contentClassName?: string;
  mainClassName?: string;
};

type ShellNavItem = MobileNavItem & {
  pageKey: AppPageKey;
};

const navItemClassName =
  "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 px-4 py-2.5 rounded-xl transition-all font-medium text-sm flex items-center gap-3";
const navItemActiveClassName =
  "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 font-bold";
const utilityButtonClassName =
  "flex size-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400";

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getPrimaryNavItems(t: ReturnType<typeof useLocale>["t"]): ShellNavItem[] {
  return [
    {
      href: "/today",
      label: t.nav.today,
      icon: CalendarDays,
      pageKey: "today",
    },
    {
      href: "/transactions",
      label: t.nav.transactions,
      icon: Receipt,
      pageKey: "transactions",
    },
    {
      href: "/employees",
      label: t.nav.employees,
      icon: Users,
      pageKey: "employees",
    },
    {
      href: "/payroll",
      label: t.nav.payroll,
      icon: Banknote,
      pageKey: "payroll",
    },
    {
      href: "/reports",
      label: t.nav.reports,
      icon: BarChart3,
      pageKey: "reports",
    },
  ];
}

function getPageMeta(pageKey: AppPageKey, t: ReturnType<typeof useLocale>["t"]) {
  return t.pages[pageKey];
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "emerald" | "slate" | "rose";
}) {
  const toneClassName =
    tone === "emerald"
      ? "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-900/30 dark:text-emerald-400"
      : tone === "rose"
        ? "border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-800/80 dark:bg-rose-900/30 dark:text-rose-300"
        : "border-slate-200/80 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
        toneClassName,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "emerald"
            ? "bg-emerald-500"
            : tone === "rose"
              ? "bg-rose-500"
              : "bg-slate-400",
        )}
      />
      {label}
    </span>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  pathname: string;
}) {
  const isActive = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(navItemClassName, isActive && navItemActiveClassName)}
    >
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({
  pageKey,
  sessionMode,
  dataMode,
  children,
  hidePageHeader = false,
  contentClassName,
  mainClassName,
}: AppShellProps) {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();
  const page = getPageMeta(pageKey, t);
  const primaryNavItems = getPrimaryNavItems(t);
  const settingsLabel = locale === "bg" ? "Настройки" : "Settings";
  const navLabel = locale === "bg" ? "Навигация" : "Navigation";
  const statusLabel = locale === "bg" ? "Статус" : "Status";
  const operationsLabel = locale === "bg" ? "Операции" : "Operations";
  const sessionLabel =
    sessionMode === "supabase" ? t.shell.sessionActive : t.shell.sessionDemo;
  const dataLabel =
    dataMode === "error"
      ? t.shell.dataUnavailable
      : dataMode === "supabase"
        ? t.shell.dataLive
        : t.shell.dataDemo;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200/60 lg:bg-white dark:lg:border-slate-800 dark:lg:bg-slate-900">
        <div className="flex h-full flex-col px-4 py-6">
          <Link
            href="/today"
            className="group flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-3 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-emerald-800/60 dark:hover:bg-emerald-900/20"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-[0_18px_40px_rgba(5,150,105,0.24)]">
              <Leaf className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600">
                KoiRaboti
              </p>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                {t.shell.subtitle}
              </p>
            </div>
          </Link>

          <div className="mt-8 px-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
              {navLabel}
            </p>
          </div>

          <nav className="mt-3 flex flex-col gap-1.5">
            {primaryNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                pathname={pathname}
              />
            ))}
          </nav>

          <div className="mt-auto space-y-4 pt-8">
            <div className="border-t border-slate-200/60 pt-4 dark:border-slate-800">
              <SidebarLink
                href="/profile"
                label={settingsLabel}
                icon={Settings}
                pathname={pathname}
              />
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                {statusLabel}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusChip label={sessionLabel} tone="emerald" />
                <StatusChip
                  label={dataLabel}
                  tone={
                    dataMode === "error"
                      ? "rose"
                      : dataMode === "supabase"
                        ? "slate"
                        : "emerald"
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-800/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLocale(locale === "en" ? "bg" : "en")}
                className="h-10 flex-1 rounded-xl bg-white text-xs font-bold uppercase tracking-[0.16em] text-slate-600 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400"
                aria-label={
                  locale === "en" ? "Switch to Bulgarian" : "Switch to English"
                }
              >
                {locale === "en" ? "БГ" : "EN"}
              </Button>
              <form action={logoutAction} className="flex-1">
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full rounded-xl text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <LogOut className="size-4" />
                  {t.shell.logOut}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/90 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/90">
          <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-3 px-4 py-3 md:px-8 lg:px-12">
            <Link href="/today" className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-[0_16px_30px_rgba(5,150,105,0.24)]">
                <Leaf className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">
                  KoiRaboti
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {t.shell.subtitle}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setLocale(locale === "en" ? "bg" : "en")}
                className="size-10 rounded-xl border border-slate-200/70 bg-white text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400"
                aria-label={
                  locale === "en" ? "Switch to Bulgarian" : "Switch to English"
                }
              >
                {locale === "en" ? "БГ" : "EN"}
              </Button>

              <Link href="/profile" className={utilityButtonClassName} aria-label={settingsLabel}>
                <Settings className="size-4" />
              </Link>

              <form action={logoutAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className={utilityButtonClassName}
                  aria-label={t.shell.logOut}
                >
                  <LogOut className="size-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mx-auto w-full max-w-[1800px] px-4 pb-28 pt-6 md:px-8 lg:px-12 lg:pb-10 lg:pt-8",
            contentClassName,
          )}
        >
          {!hidePageHeader ? (
            <header className="mb-6 rounded-[1.75rem] border border-slate-200/70 bg-white/85 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/75 lg:mb-8 lg:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {operationsLabel}
                  </span>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                      {page.title}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {page.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <StatusChip label={sessionLabel} tone="emerald" />
                  <StatusChip
                    label={dataLabel}
                    tone={
                      dataMode === "error"
                        ? "rose"
                        : dataMode === "supabase"
                          ? "slate"
                          : "emerald"
                    }
                  />
                </div>
              </div>
            </header>
          ) : null}

          <main className={cn("flex-1", mainClassName)}>{children}</main>
        </div>
      </div>

      <MobileNav items={primaryNavItems} />
    </div>
  );
}

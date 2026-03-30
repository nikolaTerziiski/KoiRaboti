"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarClock, FileText, UserRound, Users } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const { locale, t } = useLocale();
  const profileLabel = locale === "bg" ? "Профил" : "Profile";

  const navItems = [
    { href: "/today", label: t.nav.today, icon: CalendarClock },
    { href: "/employees", label: t.nav.employees, icon: Users },
    { href: "/payroll", label: t.nav.payroll, icon: BarChart3 },
    { href: "/reports", label: t.nav.reports, icon: FileText },
    { href: "/profile", label: profileLabel, icon: UserRound },
  ];

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 lg:hidden"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <nav className="pointer-events-auto flex w-full max-w-md items-center justify-between rounded-2xl border border-border bg-card/95 px-3 py-2 shadow-md backdrop-blur sm:max-w-3xl">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

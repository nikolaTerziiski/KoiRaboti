"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarClock, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/today", label: "Today", icon: CalendarClock },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/payroll", label: "Payroll", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <nav className="pointer-events-auto flex w-full max-w-md items-center justify-between rounded-[1.75rem] border border-border/90 bg-card/95 px-3 py-2 shadow-[0_18px_45px_-24px_rgba(14,44,19,0.45)] backdrop-blur sm:max-w-3xl">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition-colors",
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

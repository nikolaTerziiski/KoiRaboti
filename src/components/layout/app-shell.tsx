import Link from "next/link";
import type { ReactNode } from "react";
import { Leaf, LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AppShellProps = {
  title: string;
  description: string;
  sessionLabel: string;
  dataLabel: string;
  children: ReactNode;
};

export function AppShell({
  title,
  description,
  sessionLabel,
  dataLabel,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-5 sm:max-w-3xl sm:px-6">
        <header className="rounded-[2rem] border border-border/80 bg-card/90 p-4 shadow-[0_18px_60px_-26px_rgba(15,55,24,0.38)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <Link href="/today" className="inline-flex items-center gap-2">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Leaf className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                    KoiRaboti
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Restaurant daily control
                  </p>
                </div>
              </Link>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" />
                Log out
              </Button>
            </form>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="success">{sessionLabel}</Badge>
            <Badge variant="outline">{dataLabel}</Badge>
          </div>
        </header>
        <main className="mt-5 flex-1">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}

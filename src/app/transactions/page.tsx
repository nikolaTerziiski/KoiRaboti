import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { TransactionsPageClient } from "@/components/transactions/transactions-page-client";
import { ErrorCard } from "@/components/ui/error-card";
import { getRestaurantSnapshot } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Transactions - KoiRaboti" };

export default async function TransactionsPage() {
  const [sessionMode, snapshot] = await Promise.all([
    getSessionMode(),
    getRestaurantSnapshot(),
  ]);

  if (sessionMode === "guest") {
    redirect("/login");
  }

  const dataMode = snapshot.errorMessage
    ? "error"
    : snapshot.mode === "supabase"
      ? "supabase"
      : "demo";

  return (
    <AppShell
      pageKey="transactions"
      sessionMode={sessionMode === "supabase" ? "supabase" : "demo"}
      dataMode={dataMode}
      hidePageHeader
      contentClassName="max-w-none px-0 pt-0 sm:px-0 lg:px-0 lg:pt-0"
    >
      {snapshot.errorMessage ? (
        <ErrorCard pageKey="transactions" message={snapshot.errorMessage} />
      ) : (
        <TransactionsPageClient reports={snapshot.reports} dataMode={snapshot.mode} />
      )}
    </AppShell>
  );
}

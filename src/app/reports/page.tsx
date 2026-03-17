import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ReportsPageClient } from "@/components/reports/reports-page-client";
import { getRestaurantSnapshot } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [sessionMode, snapshot] = await Promise.all([
    getSessionMode(),
    getRestaurantSnapshot(),
  ]);

  if (sessionMode === "guest") {
    redirect("/login");
  }

  return (
    <AppShell
      title="Reports"
      description="Scan daily turnover, profit, card totals, and manual expense history."
      sessionLabel={sessionMode === "supabase" ? "Supabase session" : "Demo session"}
      dataLabel={snapshot.mode === "supabase" ? "Data: Supabase" : "Data: demo"}
    >
      <ReportsPageClient reports={snapshot.reports} dataMode={snapshot.mode} />
    </AppShell>
  );
}

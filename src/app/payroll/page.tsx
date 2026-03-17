import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PayrollPageClient } from "@/components/payroll/payroll-page-client";
import { getRestaurantSnapshot } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const [sessionMode, snapshot] = await Promise.all([
    getSessionMode(),
    getRestaurantSnapshot(),
  ]);

  if (sessionMode === "guest") {
    redirect("/login");
  }

  return (
    <AppShell
      title="Payroll"
      description="Review pay for the 1st to 15th and 16th to end-of-month windows."
      sessionLabel={sessionMode === "supabase" ? "Supabase session" : "Demo session"}
      dataLabel={snapshot.mode === "supabase" ? "Data: Supabase" : "Data: demo"}
    >
      <PayrollPageClient
        employees={snapshot.employees}
        reports={snapshot.reports}
        dataMode={snapshot.mode}
      />
    </AppShell>
  );
}

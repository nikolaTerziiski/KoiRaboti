import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PayrollPageClient } from "@/components/payroll/payroll-page-client";
import { ErrorCard } from "@/components/ui/error-card";
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

  const dataMode = snapshot.errorMessage
    ? "error"
    : snapshot.mode === "supabase"
      ? "supabase"
      : "demo";

  return (
    <AppShell
      pageKey="payroll"
      sessionMode={sessionMode === "supabase" ? "supabase" : "demo"}
      dataMode={dataMode}
    >
      {snapshot.errorMessage ? (
        <ErrorCard pageKey="payroll" message={snapshot.errorMessage} />
      ) : (
        <PayrollPageClient
          employees={snapshot.employees}
          reports={snapshot.reports}
          dataMode={snapshot.mode}
        />
      )}
    </AppShell>
  );
}

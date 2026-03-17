import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ReportsPageClient } from "@/components/reports/reports-page-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const dataLabel = snapshot.errorMessage
    ? "Data: error"
    : snapshot.mode === "supabase"
      ? "Data: Supabase"
      : "Data: demo";

  return (
    <AppShell
      title="Reports"
      description="Scan daily turnover, profit, card totals, and manual expense history."
      sessionLabel={sessionMode === "supabase" ? "Supabase session" : "Demo session"}
      dataLabel={dataLabel}
    >
      {snapshot.errorMessage ? (
        <Card>
          <CardHeader>
            <CardTitle>Live report data could not be loaded</CardTitle>
            <CardDescription>
              Supabase env vars are present, so the app is surfacing the load failure.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {snapshot.errorMessage}
          </CardContent>
        </Card>
      ) : (
        <ReportsPageClient reports={snapshot.reports} dataMode={snapshot.mode} />
      )}
    </AppShell>
  );
}

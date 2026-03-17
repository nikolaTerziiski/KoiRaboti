import { format } from "date-fns";
import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { TodayDashboard } from "@/components/today/today-dashboard";
import { getRestaurantSnapshot } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [sessionMode, snapshot] = await Promise.all([
    getSessionMode(),
    getRestaurantSnapshot(),
  ]);

  if (sessionMode === "guest") {
    redirect("/login");
  }

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const initialReport =
    snapshot.reports.find((report) => report.workDate === todayKey) ?? {
      id: `report-${todayKey}`,
      workDate: todayKey,
      turnover: 0,
      profit: 0,
      cardAmount: 0,
      manualExpense: 800,
      attendanceEntries: [],
    };

  return (
    <AppShell
      title="Today"
      description="Log daily numbers and staff attendance before payroll closes."
      sessionLabel={sessionMode === "supabase" ? "Supabase session" : "Demo session"}
      dataLabel={snapshot.mode === "supabase" ? "Data: Supabase" : "Data: demo"}
    >
      <TodayDashboard
        employees={snapshot.employees}
        initialReport={initialReport}
        dataMode={snapshot.mode}
      />
    </AppShell>
  );
}

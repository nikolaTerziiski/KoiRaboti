import { format } from "date-fns";
import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { TodayDashboard } from "@/components/today/today-dashboard";
import { ErrorCard } from "@/components/ui/error-card";
import { DEFAULT_MANUAL_EXPENSE_EUR } from "@/lib/format";
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

  const dataMode = snapshot.errorMessage
    ? "error"
    : snapshot.mode === "supabase"
      ? "supabase"
      : "demo";

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const defaultExpense =
    snapshot.restaurant?.defaultDailyExpense ?? DEFAULT_MANUAL_EXPENSE_EUR;
  const initialReport =
    snapshot.reports.find((report) => report.workDate === todayKey) ?? {
      id: `report-${todayKey}`,
      workDate: todayKey,
      turnover: 0,
      profit: 0,
      cardAmount: 0,
      manualExpense: defaultExpense,
      notes: null,
      attendanceEntries: [],
    };

  const dashboardVersion = [
    initialReport.workDate,
    initialReport.turnover,
    initialReport.profit,
    initialReport.cardAmount,
    initialReport.manualExpense,
    initialReport.notes ?? "",
    initialReport.attendanceEntries
      .map(
        (entry) =>
          `${entry.employeeId}:${entry.payUnits}:${entry.payOverride ?? ""}:${entry.notes ?? ""}`,
      )
      .join("|"),
    snapshot.employees
      .map((employee) => `${employee.id}:${employee.dailyRate}:${employee.isActive}`)
      .join("|"),
  ].join("::");

  return (
    <AppShell
      pageKey="today"
      sessionMode={sessionMode === "supabase" ? "supabase" : "demo"}
      dataMode={dataMode}
    >
      {snapshot.errorMessage ? (
        <ErrorCard pageKey="today" message={snapshot.errorMessage} />
      ) : (
        <TodayDashboard
          key={dashboardVersion}
          employees={snapshot.employees}
          initialReport={initialReport}
          dataMode={snapshot.mode}
        />
      )}
    </AppShell>
  );
}

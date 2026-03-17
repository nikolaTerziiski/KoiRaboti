import { format } from "date-fns";
import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { TodayDashboard } from "@/components/today/today-dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const dataLabel = snapshot.errorMessage
    ? "Data: error"
    : snapshot.mode === "supabase"
      ? "Data: Supabase"
      : "Data: demo";

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const initialReport =
    snapshot.reports.find((report) => report.workDate === todayKey) ?? {
      id: `report-${todayKey}`,
      workDate: todayKey,
      turnover: 0,
      profit: 0,
      cardAmount: 0,
      manualExpense: DEFAULT_MANUAL_EXPENSE_EUR,
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
          `${entry.employeeId}:${entry.shift1}:${entry.shift2}:${entry.payUnits}:${entry.payOverride ?? ""}:${entry.notes ?? ""}`,
      )
      .join("|"),
    snapshot.employees
      .map((employee) => `${employee.id}:${employee.dailyRate}:${employee.isActive}`)
      .join("|"),
  ].join("::");

  return (
    <AppShell
      title="Today"
      description="Log daily numbers and staff attendance before payroll closes."
      sessionLabel={sessionMode === "supabase" ? "Supabase session" : "Demo session"}
      dataLabel={dataLabel}
    >
      {snapshot.errorMessage ? (
        <Card>
          <CardHeader>
            <CardTitle>Live data could not be loaded</CardTitle>
            <CardDescription>
              Supabase env vars are present, so demo fallback is intentionally disabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {snapshot.errorMessage}
          </CardContent>
        </Card>
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

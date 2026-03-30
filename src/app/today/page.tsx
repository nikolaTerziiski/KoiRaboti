import type { Metadata } from "next";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { TodayDashboard, type TaskKey } from "@/components/today/today-dashboard";
import { ErrorCard } from "@/components/ui/error-card";
import { DEFAULT_MANUAL_EXPENSE_EUR } from "@/lib/format";
import { getRestaurantSnapshot } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Today — KoiRaboti" };

type TodayPageSearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

type TodayPageProps = {
  searchParams?: TodayPageSearchParams;
};

function normalizeInitialTask(
  rawTask: string | string[] | undefined,
): TaskKey | null {
  const task = Array.isArray(rawTask) ? rawTask[0] : rawTask;

  return task === "finance" || task === "attendance" || task === "expenses"
    ? task
    : null;
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
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
  const initialTask = normalizeInitialTask(resolvedSearchParams?.task);

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
      expenseItems: [],
    };

  const dashboardVersion = [
    initialTask ?? "none",
    initialReport.workDate,
    initialReport.turnover,
    initialReport.profit,
    initialReport.cardAmount,
    initialReport.manualExpense,
    initialReport.notes ?? "",
    initialReport.expenseItems
      .map(
        (item) =>
          `${item.id}:${item.categoryId ?? ""}:${item.amount}:${item.description ?? ""}:${item.sourceType}`,
      )
      .join("|"),
    initialReport.attendanceEntries
      .map(
        (entry) =>
          `${entry.employeeId}:${entry.dailyRate}:${entry.payUnits}:${entry.payOverride ?? ""}:${entry.notes ?? ""}`,
      )
      .join("|"),
    snapshot.employees
      .map((employee) => `${employee.id}:${employee.role}:${employee.dailyRate}:${employee.isActive}`)
      .join("|"),
    snapshot.expenseCategories.map((category) => `${category.id}:${category.name}`).join("|"),
  ].join("::");

  return (
    <AppShell
      pageKey="today"
      sessionMode={sessionMode === "supabase" ? "supabase" : "demo"}
      dataMode={dataMode}
      hidePageHeader
    >
      {snapshot.errorMessage ? (
        <ErrorCard pageKey="today" message={snapshot.errorMessage} />
      ) : (
        <TodayDashboard
          key={dashboardVersion}
          employees={snapshot.employees}
          expenseCategories={snapshot.expenseCategories}
          initialReport={initialReport}
          dataMode={snapshot.mode}
          initialTask={initialTask}
        />
      )}
    </AppShell>
  );
}

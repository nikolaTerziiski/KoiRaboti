import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { EmployeesPageClient } from "@/components/employees/employees-page-client";
import { AppShell } from "@/components/layout/app-shell";
import { getRestaurantSnapshot } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const [sessionMode, snapshot] = await Promise.all([
    getSessionMode(),
    getRestaurantSnapshot(),
  ]);

  if (sessionMode === "guest") {
    redirect("/login");
  }

  return (
    <AppShell
      title="Employees"
      description="Manage the active roster and each employee's daily rate."
      sessionLabel={sessionMode === "supabase" ? "Supabase session" : "Demo session"}
      dataLabel={snapshot.mode === "supabase" ? "Data: Supabase" : "Data: demo"}
    >
      <EmployeesPageClient
        initialEmployees={snapshot.employees}
        dataMode={snapshot.mode}
      />
    </AppShell>
  );
}

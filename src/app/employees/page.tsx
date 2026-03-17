import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { EmployeesPageClient } from "@/components/employees/employees-page-client";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorCard } from "@/components/ui/error-card";
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

  const dataMode = snapshot.errorMessage
    ? "error"
    : snapshot.mode === "supabase"
      ? "supabase"
      : "demo";

  return (
    <AppShell
      pageKey="employees"
      sessionMode={sessionMode === "supabase" ? "supabase" : "demo"}
      dataMode={dataMode}
    >
      {snapshot.errorMessage ? (
        <ErrorCard pageKey="employees" message={snapshot.errorMessage} />
      ) : (
        <EmployeesPageClient
          initialEmployees={snapshot.employees}
          dataMode={snapshot.mode}
        />
      )}
    </AppShell>
  );
}

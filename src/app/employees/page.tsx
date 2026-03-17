import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { EmployeesPageClient } from "@/components/employees/employees-page-client";
import { AppShell } from "@/components/layout/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const dataLabel = snapshot.errorMessage
    ? "Data: error"
    : snapshot.mode === "supabase"
      ? "Data: Supabase"
      : "Data: demo";

  return (
    <AppShell
      title="Employees"
      description="Manage the active roster and each employee's daily rate."
      sessionLabel={sessionMode === "supabase" ? "Supabase session" : "Demo session"}
      dataLabel={dataLabel}
    >
      {snapshot.errorMessage ? (
        <Card>
          <CardHeader>
            <CardTitle>Live employee data could not be loaded</CardTitle>
            <CardDescription>
              Supabase env vars are present, so the app is not hiding this behind demo data.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {snapshot.errorMessage}
          </CardContent>
        </Card>
      ) : (
        <EmployeesPageClient
          initialEmployees={snapshot.employees}
          dataMode={snapshot.mode}
        />
      )}
    </AppShell>
  );
}

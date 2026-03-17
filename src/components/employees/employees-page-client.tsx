"use client";

import { EmployeeCreateForm } from "@/components/employees/employee-create-form";
import { EmployeeRowEditor } from "@/components/employees/employee-row-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MoneyDisplay } from "@/components/ui/money-display";
import { useLocale } from "@/lib/i18n/context";
import type { Employee, SnapshotMode } from "@/lib/types";

type EmployeesPageClientProps = {
  initialEmployees: Employee[];
  dataMode: SnapshotMode;
};

export function EmployeesPageClient({
  initialEmployees,
  dataMode,
}: EmployeesPageClientProps) {
  const { t } = useLocale();
  const activeEmployees = initialEmployees.filter((employee) => employee.isActive);
  const averageRate =
    activeEmployees.reduce((sum, employee) => sum + employee.dailyRate, 0) /
    (activeEmployees.length || 1);
  const highestRate = activeEmployees.reduce(
    (highest, employee) => Math.max(highest, employee.dailyRate),
    0,
  );
  const rosterVersion = initialEmployees
    .map(
      (employee) =>
        `${employee.id}:${employee.fullName}:${employee.phoneNumber}:${employee.dailyRate}:${employee.isActive}`,
    )
    .join("|");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {t.employees.activeTeam}
            </p>
            <p className="mt-2 text-2xl font-semibold">{activeEmployees.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {t.employees.avgDailyRate}
            </p>
            <div className="mt-2">
              <MoneyDisplay amount={averageRate} />
            </div>
          </CardContent>
        </Card>
      </div>

      <EmployeeCreateForm key={rosterVersion} dataMode={dataMode} />

      <Card>
        <CardHeader>
          <CardTitle>{t.employees.employeeRoster}</CardTitle>
          <CardDescription>{t.employees.rosterDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl bg-secondary/35 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {t.employees.highestRate}
            </p>
            <div className="mt-2">
              <MoneyDisplay amount={highestRate} />
            </div>
          </div>
          {initialEmployees.map((employee) => (
            <EmployeeRowEditor
              key={`${employee.id}:${employee.fullName}:${employee.phoneNumber}:${employee.dailyRate}:${employee.isActive}`}
              employee={employee}
              dataMode={dataMode}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

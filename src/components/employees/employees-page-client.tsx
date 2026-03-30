"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { EmployeeCreateForm } from "@/components/employees/employee-create-form";
import { EmployeeRowEditor } from "@/components/employees/employee-row-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const activeEmployees = initialEmployees.filter((employee) => employee.isActive);
  const averageRate =
    activeEmployees.reduce((sum, employee) => sum + employee.dailyRate, 0) /
    (activeEmployees.length || 1);
  const rosterVersion = initialEmployees
    .map(
      (employee) =>
        `${employee.id}:${employee.fullName}:${employee.role}:${employee.phoneNumber ?? ""}:${employee.dailyRate}:${employee.isActive}`,
    )
    .join("|");

  return (
    <div className="space-y-6">
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <section className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.employees.employeeRoster}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t.employees.addEmployeeDesc}
            </p>
          </div>

          <DialogTrigger asChild>
            <Button className="h-12 rounded-2xl bg-emerald-600 px-5 text-white hover:bg-emerald-700">
              <Plus className="size-4" />
              {t.employees.addEmployee}
            </Button>
          </DialogTrigger>
        </section>

        <EmployeeCreateForm
          key={`${rosterVersion}:${isCreateOpen ? "open" : "closed"}`}
          dataMode={dataMode}
          onSuccess={() => setIsCreateOpen(false)}
        />
      </Dialog>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {t.employees.activeTeam}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {activeEmployees.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {t.employees.avgDailyRate}
            </p>
            <div className="mt-3">
              <MoneyDisplay amount={averageRate} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader>
          <CardTitle>{t.employees.employeeRoster}</CardTitle>
        </CardHeader>

        <CardContent>
          {initialEmployees.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-[1.75rem] border border-dashed border-slate-200/70 bg-slate-50 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex size-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Users className="size-7" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  {t.employees.noEmployees}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t.employees.addEmployeeDesc}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="h-11 rounded-2xl bg-emerald-600 px-5 text-white hover:bg-emerald-700"
              >
                <Plus className="size-4" />
                {t.employees.addEmployee}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {initialEmployees.map((employee) => (
                <EmployeeRowEditor
                  key={`${employee.id}:${employee.fullName}:${employee.role}:${employee.phoneNumber ?? ""}:${employee.dailyRate}:${employee.isActive}`}
                  employee={employee}
                  dataMode={dataMode}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

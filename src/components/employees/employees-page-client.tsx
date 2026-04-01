"use client";

import { useDeferredValue, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { EmployeeCreateForm } from "@/components/employees/employee-create-form";
import { EmployeeRowEditor } from "@/components/employees/employee-row-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n/context";
import {
  formatBgnCurrencyFromEur,
  formatCurrency,
} from "@/lib/format";
import type { Employee, SnapshotMode } from "@/lib/types";
import { cn } from "@/lib/utils";

type EmployeesPageClientProps = {
  initialEmployees: Employee[];
  dataMode: SnapshotMode;
};

type RoleFilter = "all" | "kitchen" | "service" | "inactive";
type CurrencyMode = "EUR" | "BGN";

const OPTIMAL_TEAM_SIZE = 15;

function normalizeSearchQuery(value: string) {
  return value.trim().toLowerCase();
}

function getCurrencyDisplay(amount: number, currencyMode: CurrencyMode) {
  if (currencyMode === "BGN") {
    return {
      primary: formatBgnCurrencyFromEur(amount),
      secondary: formatCurrency(amount),
    };
  }

  return {
    primary: formatCurrency(amount),
    secondary: formatBgnCurrencyFromEur(amount),
  };
}

export function EmployeesPageClient({
  initialEmployees,
  dataMode,
}: EmployeesPageClientProps) {
  const { t, locale } = useLocale();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>("EUR");
  const activeEmployees = initialEmployees.filter((employee) => employee.isActive);
  const averageRate =
    activeEmployees.reduce((sum, employee) => sum + employee.dailyRate, 0) /
    (activeEmployees.length || 1);
  const rosterVersion = initialEmployees
    .map(
      (employee) =>
        `${employee.id}:${employee.fullName}:${employee.role}:${employee.phoneNumber ?? ""}:${employee.dailyRate}:${employee.isActive}:${employee.paymentSchedule ?? ""}:${employee.paymentDay1 ?? ""}:${employee.paymentDay2 ?? ""}:${employee.paymentWeekday ?? ""}:${employee.balanceStartsFrom ?? ""}`,
    )
    .join("|");
  const copy =
    locale === "bg"
      ? {
          searchPlaceholder: "Търси по име или телефон",
          all: "Всички",
          inactive: "Неактивни",
          currencyLabel: "Валутен изглед",
          optimal: "Оптимален",
          overstaffed: "Над оптимума",
          showing: (shown: number, total: number) =>
            `Показани ${shown} от ${total} служители`,
          noMatchesTitle: "Няма съвпадения за тази комбинация.",
          noMatchesDescription: "Промени търсенето или избери друг филтър.",
          emptyTitle:
            "Нека изградим мечтания ти екип. Добави първия служител, за да започнеш.",
        }
      : {
          searchPlaceholder: "Search by name or phone",
          all: "All",
          inactive: "Inactive",
          currencyLabel: "Currency view",
          optimal: "Optimal",
          overstaffed: "Overstaffed",
          showing: (shown: number, total: number) =>
            `Showing ${shown} of ${total} team members`,
          noMatchesTitle: "No employees match this search yet.",
          noMatchesDescription: "Try another search term or switch filters.",
          emptyTitle:
            "Let's build your dream team. Add your first employee to get started.",
        };
  const normalizedSearchQuery = normalizeSearchQuery(deferredSearchQuery);
  const filteredEmployees = initialEmployees.filter((employee) => {
    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      employee.fullName.toLowerCase().includes(normalizedSearchQuery) ||
      (employee.phoneNumber ?? "").toLowerCase().includes(normalizedSearchQuery);

    if (!matchesSearch) {
      return false;
    }

    if (roleFilter === "all") {
      return true;
    }

    if (roleFilter === "inactive") {
      return !employee.isActive;
    }

    return employee.role === roleFilter;
  });
  const roleFilters: Array<{ value: RoleFilter; label: string }> = [
    { value: "all", label: copy.all },
    { value: "kitchen", label: t.common.kitchen },
    { value: "service", label: t.common.service },
    { value: "inactive", label: copy.inactive },
  ];
  const staffingProgress = Math.min(
    (activeEmployees.length / OPTIMAL_TEAM_SIZE) * 100,
    100,
  );
  const staffingStatus =
    activeEmployees.length > OPTIMAL_TEAM_SIZE
      ? copy.overstaffed
      : copy.optimal;
  const averageRateDisplay = getCurrencyDisplay(averageRate, currencyMode);

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
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeEmployees.length}
              </p>
              <p
                className={cn(
                  "text-sm font-semibold",
                  activeEmployees.length > OPTIMAL_TEAM_SIZE
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {activeEmployees.length} / {OPTIMAL_TEAM_SIZE} ({staffingStatus})
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/50">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  activeEmployees.length > OPTIMAL_TEAM_SIZE
                    ? "bg-orange-500"
                    : "bg-emerald-500",
                )}
                style={{ width: `${staffingProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {t.employees.avgDailyRate}
                </p>
                <div className="mt-3">
                  <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {averageRateDisplay.primary}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {averageRateDisplay.secondary}
                  </p>
                </div>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {currencyMode}
              </div>
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
                  {copy.emptyTitle}
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
            <>
              <div className="mb-5 rounded-[1.5rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={copy.searchPlaceholder}
                      className="h-11 rounded-xl border-slate-200/70 bg-white pl-10 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {copy.currencyLabel}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["EUR", "BGN"] as const).map((mode) => (
                        <Button
                          key={mode}
                          type="button"
                          variant={currencyMode === mode ? "default" : "outline"}
                          aria-pressed={currencyMode === mode}
                          onClick={() => setCurrencyMode(mode)}
                          className={cn(
                            "h-10 rounded-xl px-4 text-sm",
                            currencyMode === mode
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "border-slate-200/70 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                          )}
                        >
                          {mode}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    {roleFilters.map((filter) => (
                      <Button
                        key={filter.value}
                        type="button"
                        variant={roleFilter === filter.value ? "default" : "outline"}
                        aria-pressed={roleFilter === filter.value}
                        onClick={() => setRoleFilter(filter.value)}
                        className={cn(
                          "h-10 rounded-xl px-4 text-sm",
                          roleFilter === filter.value
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "border-slate-200/70 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                        )}
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {copy.showing(filteredEmployees.length, initialEmployees.length)}
                  </p>
                </div>
              </div>

              {filteredEmployees.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-slate-200/70 bg-slate-50 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex size-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Users className="size-6" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {copy.noMatchesTitle}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {copy.noMatchesDescription}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {filteredEmployees.map((employee) => (
                    <EmployeeRowEditor
                      key={employee.id}
                      employee={employee}
                      dataMode={dataMode}
                      currencyMode={currencyMode}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

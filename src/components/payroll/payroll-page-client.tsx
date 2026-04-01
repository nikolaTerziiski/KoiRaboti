"use client";

import { useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { PayrollEmployeeCard } from "@/components/payroll/payroll-employee-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildPayrollRows } from "@/lib/payroll";
import { useLocale } from "@/lib/i18n/context";
import type {
  DailyReportWithAttendance,
  Employee,
  PayrollPayment,
  SnapshotMode,
} from "@/lib/types";

type PayrollPageClientProps = {
  employees: Employee[];
  reports: DailyReportWithAttendance[];
  payments: PayrollPayment[];
  dataMode: SnapshotMode;
};

export function PayrollPageClient({
  employees,
  reports,
  payments,
  dataMode,
}: PayrollPageClientProps) {
  const { t } = useLocale();
  const [isEveryoneCollapsed, setIsEveryoneCollapsed] = useState(true);
  const today = new Date();
  const rows = buildPayrollRows(employees, reports, payments, today);
  const dueRows = rows.filter((row) => row.isDue && row.netAmount > 0.0001);
  const upcomingRows = rows.filter(
    (row) =>
      !row.isDue &&
      row.netAmount > 0.0001 &&
      differenceInCalendarDays(row.nextPayday, today) <= 7,
  );
  const highlightedIds = new Set([
    ...dueRows.map((row) => row.employee.id),
    ...upcomingRows.map((row) => row.employee.id),
  ]);
  const everyoneRows = rows.filter((row) => !highlightedIds.has(row.employee.id));

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-28 lg:pb-10">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t.payroll.payNow}
          </h2>
          <Badge
            variant="outline"
            className="border-amber-200 bg-white text-amber-700 dark:border-amber-900/60 dark:bg-slate-900 dark:text-amber-300"
          >
            {dueRows.length}
          </Badge>
        </div>

        {dueRows.length === 0 ? (
          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-6 py-10 text-center text-sm font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
            {t.payroll.noPaymentsToday}
          </div>
        ) : (
          <div className="space-y-3">
            {dueRows.map((row) => (
              <PayrollEmployeeCard
                key={row.employee.id}
                row={row}
                dataMode={dataMode}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t.payroll.upcoming}
          </h2>
          <Badge
            variant="outline"
            className="border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            {upcomingRows.length}
          </Badge>
        </div>

        {upcomingRows.length > 0 ? (
          <div className="space-y-3">
            {upcomingRows.map((row) => (
              <PayrollEmployeeCard
                key={row.employee.id}
                row={row}
                dataMode={dataMode}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {t.payroll.noUpcomingPayments}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.payroll.everyone}
            </h2>
            <Badge
              variant="outline"
              className="border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {everyoneRows.length}
            </Badge>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-2xl"
            onClick={() => setIsEveryoneCollapsed((current) => !current)}
          >
            {isEveryoneCollapsed ? t.payroll.showEveryone : t.payroll.hideEveryone}
          </Button>
        </div>

        {!isEveryoneCollapsed ? (
          <div className="space-y-3">
            {everyoneRows.map((row) => (
              <PayrollEmployeeCard
                key={row.employee.id}
                row={row}
                dataMode={dataMode}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

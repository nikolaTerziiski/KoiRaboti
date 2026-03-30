"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth } from "date-fns";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MoneyDisplay } from "@/components/ui/money-display";
import { SelectField } from "@/components/ui/select-field";
import { useLocale } from "@/lib/i18n/context";
import { calculateMonthStats, type MonthStats } from "@/lib/profile-stats";
import { formatMonthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DailyReportWithAttendance, Profile, Restaurant, SnapshotMode } from "@/lib/types";

type ProfilePageClientProps = {
  reports: DailyReportWithAttendance[];
  profile: Profile | null;
  restaurant: Restaurant | null;
  dataMode: SnapshotMode;
};

function getCurrentMonthKey() {
  return format(startOfMonth(new Date()), "yyyy-MM-01");
}

export function ProfilePageClient({
  reports,
  profile,
  restaurant,
  dataMode,
}: ProfilePageClientProps) {
  const { t, locale } = useLocale();
  const currentMonthKey = getCurrentMonthKey();
  const monthOptions = useMemo(() => {
    const months = new Set(reports.map((report) => `${report.workDate.slice(0, 7)}-01`));
    months.add(currentMonthKey);

    return Array.from(months).sort((left, right) => right.localeCompare(left));
  }, [currentMonthKey, reports]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  const selectedMonthReports = useMemo(
    () =>
      reports.filter((report) =>
        selectedMonth ? report.workDate.startsWith(selectedMonth.slice(0, 7)) : true,
      ),
    [reports, selectedMonth],
  );

  const stats: MonthStats = useMemo(
    () => calculateMonthStats(selectedMonthReports),
    [selectedMonthReports],
  );

  const monthLabel = formatMonthLabel(selectedMonth, locale);
  const laborCostRisk = stats.laborCostPercentage > 30;
  const dataModeLabel = dataMode === "demo" ? t.profile.dataDemo : t.profile.dataLive;

  const metrics = [
    { label: t.profile.totalTurnover, value: stats.totalTurnover },
    { label: t.profile.netProfit, value: stats.netProfit },
    { label: t.profile.averageDailyTurnover, value: stats.averageDailyTurnover },
    { label: t.profile.laborCost, value: stats.totalLaborCost },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.profile.title}</CardTitle>
          <CardDescription>{t.profile.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-month">{t.profile.month}</Label>
            <SelectField
              id="profile-month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month, locale)}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {monthLabel}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedMonthReports.length > 0
                ? `${selectedMonthReports.length} ${t.profile.reportsSummary}`
                : t.profile.noReports}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{dataModeLabel}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardDescription>{metric.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <MoneyDisplay amount={metric.value} className="text-3xl" />
            </CardContent>
          </Card>
        ))}
        <Card className={cn(laborCostRisk ? "border-destructive/30 bg-destructive/5" : undefined)}>
          <CardHeader className="pb-2">
            <CardDescription>{t.profile.laborCostPercentage}</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-3xl font-semibold",
                laborCostRisk ? "text-destructive" : "text-foreground",
              )}
            >
              {stats.laborCostPercentage.toFixed(1)}%
            </p>
            {laborCostRisk ? (
              <p className="mt-1 text-xs text-destructive">{t.profile.laborCostWarning}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.profile.profileTitle}</CardTitle>
          <CardDescription>{t.profile.profileDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile ? (
            <div className="space-y-2 rounded-2xl border border-border bg-muted p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {profile.fullName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.profile.email}: {profile.email}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.profile.restaurant}: {restaurant?.name ?? "KoiRaboti"}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
              {t.profile.noProfile}
            </div>
          )}

          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full">
              <LogOut className="size-4" />
              {t.profile.logout}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

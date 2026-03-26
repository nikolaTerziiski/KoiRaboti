"use client";

import { useMemo, useState } from "react";
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
  const { locale } = useLocale();
  const currentMonthKey = getCurrentMonthKey();
  const monthOptions = useMemo(() => {
    const months = new Set(reports.map((report) => `${report.workDate.slice(0, 7)}-01`));
    months.add(currentMonthKey);

    return Array.from(months).sort((left, right) => right.localeCompare(left));
  }, [currentMonthKey, reports]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  const labels = useMemo(
    () => ({
      title: locale === "bg" ? "Профил и статистики" : "Profile and stats",
      subtitle:
        locale === "bg"
          ? "Избери месец и виж основните KPI на ресторанта."
          : "Pick a month and review the restaurant KPI snapshot.",
      month: locale === "bg" ? "Месец" : "Month",
      totalTurnover: locale === "bg" ? "Общ оборот" : "Total turnover",
      netProfit: locale === "bg" ? "Чиста печалба" : "Net profit",
      averageDailyTurnover:
        locale === "bg" ? "Среден дневен оборот" : "Average daily turnover",
      laborCost: locale === "bg" ? "Разход за труд" : "Total labor cost",
      laborCostPercentage: locale === "bg" ? "% Труд от оборота" : "Labor cost %",
      profileTitle: locale === "bg" ? "Потребителски профил" : "User profile",
      profileDesc:
        locale === "bg"
          ? "Управление на акаунта и сесията."
          : "Account and session management.",
      restaurant: locale === "bg" ? "Ресторант" : "Restaurant",
      email: locale === "bg" ? "Имейл" : "Email",
      reportsSummary: locale === "bg" ? "дни с отчет" : "recorded day(s)",
      noReports:
        locale === "bg" ? "Няма отчети за този месец." : "No reports recorded for this month.",
      dataMode:
        dataMode === "demo"
          ? locale === "bg"
            ? "Демо данни"
            : "Demo data"
          : locale === "bg"
            ? "Реални данни"
            : "Live data",
      noProfile:
        locale === "bg" ? "Няма профилна информация." : "No profile information available.",
      logout: locale === "bg" ? "Изход" : "Sign out",
      laborCostWarning:
        locale === "bg"
          ? "Висок дял на трудовите разходи"
          : "Labor cost share is high",
    }),
    [dataMode, locale],
  );

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

  const metrics = [
    {
      label: labels.totalTurnover,
      value: stats.totalTurnover,
    },
    {
      label: labels.netProfit,
      value: stats.netProfit,
    },
    {
      label: labels.averageDailyTurnover,
      value: stats.averageDailyTurnover,
    },
    {
      label: labels.laborCost,
      value: stats.totalLaborCost,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
          <CardDescription>{labels.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-month">{labels.month}</Label>
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
                ? `${selectedMonthReports.length} ${labels.reportsSummary}`
                : labels.noReports}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{labels.dataMode}</p>
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
            <CardDescription>{labels.laborCostPercentage}</CardDescription>
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
              <p className="mt-1 text-xs text-destructive">{labels.laborCostWarning}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{labels.profileTitle}</CardTitle>
          <CardDescription>{labels.profileDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile ? (
            <div className="space-y-2 rounded-2xl border border-border bg-muted p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {profile.fullName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {labels.email}: {profile.email}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {labels.restaurant}: {restaurant?.name ?? "KoiRaboti"}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
              {labels.noProfile}
            </div>
          )}

          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full">
              <LogOut className="size-4" />
              {labels.logout}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

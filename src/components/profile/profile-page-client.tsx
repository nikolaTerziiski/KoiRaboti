"use client";

import { useMemo } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/ui/money-display";
import { useLocale } from "@/lib/i18n/context";
import { formatMonthLabel } from "@/lib/format";
import type { MonthlyStats } from "@/lib/profile-stats";
import type { SnapshotMode } from "@/lib/types";

type ProfilePageClientProps = {
  stats: MonthlyStats;
  dataMode: SnapshotMode;
};

export function ProfilePageClient({ stats, dataMode }: ProfilePageClientProps) {
  const { locale } = useLocale();

  const labels = useMemo(
    () => ({
      monthTitle: locale === "bg" ? "Текущ месец" : "Current month",
      monthDesc:
        locale === "bg"
          ? "Сумирани дневни отчети, присъствие и разход за заплати за избрания месец."
          : "Summed daily reports, attendance, and labor cost for the current month.",
      recordedDays: locale === "bg" ? "Отчетени дни" : "Recorded days",
      averageTurnover: locale === "bg" ? "Среден оборот" : "Average daily turnover",
      averageProfit: locale === "bg" ? "Средна печалба" : "Average daily profit",
      totalTurnover: locale === "bg" ? "Общ оборот" : "Total turnover",
      totalNetProfit: locale === "bg" ? "Обща чиста печалба" : "Total net profit",
      laborCost: locale === "bg" ? "Разход за заплати" : "Total labor cost",
      logout: locale === "bg" ? "Изход" : "Log out",
      dataMode:
        dataMode === "demo"
          ? locale === "bg"
            ? "Демо данни"
            : "Demo data"
          : locale === "bg"
            ? "Supabase данни"
            : "Supabase data",
    }),
    [dataMode, locale],
  );

  const monthLabel = formatMonthLabel(stats.monthKey, locale);
  const metrics = [
    { label: labels.averageTurnover, value: stats.averageDailyTurnover },
    { label: labels.averageProfit, value: stats.averageDailyProfit },
    { label: labels.totalTurnover, value: stats.totalTurnover },
    { label: labels.totalNetProfit, value: stats.totalNetProfit },
    { label: labels.laborCost, value: stats.totalLaborCost },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary to-[#176b38] text-primary-foreground">
        <CardHeader>
          <CardTitle className="text-xl">{labels.monthTitle}</CardTitle>
          <CardDescription className="mt-1 text-primary-foreground/80">
            {monthLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-primary-foreground/85">
          <p>{labels.monthDesc}</p>
          <p>
            {labels.recordedDays}: {stats.recordedDays}
          </p>
          <p>{labels.dataMode}</p>
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
      </div>

      <Card>
        <CardContent className="pt-6">
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

"use client";

import { useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import { LogOut, Send } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MoneyDisplay } from "@/components/ui/money-display";
import { SelectField } from "@/components/ui/select-field";
import { env } from "@/lib/env";
import { formatMonthLabel } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";
import { calculateMonthStats, type MonthStats } from "@/lib/profile-stats";
import type { DailyReportWithAttendance, Profile, Restaurant, SnapshotMode } from "@/lib/types";
import { cn } from "@/lib/utils";

type ProfilePageClientProps = {
  reports: DailyReportWithAttendance[];
  profile: Profile | null;
  restaurant: Restaurant | null;
  dataMode: SnapshotMode;
  telegramConnectUrl: string | null;
  telegramLinkedUsersCount: number;
};

function getCurrentMonthKey() {
  return format(startOfMonth(new Date()), "yyyy-MM-01");
}

export function ProfilePageClient({
  reports,
  profile,
  restaurant,
  dataMode,
  telegramConnectUrl,
  telegramLinkedUsersCount,
}: ProfilePageClientProps) {
  const { t, locale } = useLocale();
  const currentMonthKey = getCurrentMonthKey();
  const monthOptions = useMemo(() => {
    const months = new Set(reports.map((report) => `${report.workDate.slice(0, 7)}-01`));
    months.add(currentMonthKey);

    return Array.from(months).sort((left, right) => right.localeCompare(left));
  }, [currentMonthKey, reports]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  const telegramLabels = useMemo(
    () => ({
      title: locale === "bg" ? "Telegram бот" : "Telegram bot",
      description:
        locale === "bg"
          ? "Свържи Telegram, за да записваш разходи, да получаваш дневни обобщения и да задаваш въпроси за бизнеса."
          : "Connect Telegram for expense capture, daily summaries, and ops questions.",
      connect: locale === "bg" ? "Свържи в Telegram" : "Connect in Telegram",
      linked:
        locale === "bg"
          ? `${telegramLinkedUsersCount} свързан(и) Telegram акаунт(а)`
          : `${telegramLinkedUsersCount} linked Telegram account(s)`,
      hint:
        locale === "bg"
          ? "Бутонът отваря бота с еднократен токен за този ресторант."
          : "The button opens the bot with a one-time token for this restaurant.",
      commands:
        locale === "bg"
          ? "Полезни команди: /summary, /categories, /daily_on, /daily_off"
          : "Useful commands: /summary, /categories, /daily_on, /daily_off",
    }),
    [locale, telegramLinkedUsersCount],
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

      {telegramConnectUrl && env.telegramBotUsername ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Send className="size-4" />
              </div>
              <div>
                <CardTitle>{telegramLabels.title}</CardTitle>
                <CardDescription>{telegramLabels.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
              <p>{telegramLabels.linked}</p>
              <p className="mt-1">{telegramLabels.hint}</p>
              <p className="mt-2 font-medium text-foreground">{telegramLabels.commands}</p>
            </div>
            <a href={telegramConnectUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full">
                <Send className="size-4" />
                {telegramLabels.connect}
              </Button>
            </a>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

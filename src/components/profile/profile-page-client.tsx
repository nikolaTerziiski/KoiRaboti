"use client";

import { useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { LogOut, Send } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MoneyDisplay } from "@/components/ui/money-display";
import { SelectField } from "@/components/ui/select-field";
import { env } from "@/lib/env";
import { formatCurrencyPair, formatMonthLabel } from "@/lib/format";
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

type ExpenseBreakdownSlice = {
  key: string;
  label: string;
  emoji: string | null;
  amount: number;
  count: number;
  color: string;
};

const PIE_COLORS = [
  "var(--primary)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
  "var(--muted-foreground)",
];

function getCurrentMonthKey() {
  return format(startOfMonth(new Date()), "yyyy-MM-01");
}

function toFiniteNumber(value: unknown) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const numericValue =
    typeof candidate === "number"
      ? candidate
      : typeof candidate === "string"
        ? Number(candidate)
        : 0;

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function buildExpenseBreakdown(
  reports: DailyReportWithAttendance[],
  locale: "en" | "bg",
): ExpenseBreakdownSlice[] {
  const breakdown = new Map<string, ExpenseBreakdownSlice>();

  for (const report of reports) {
    for (const item of report.expenseItems) {
      const label =
        item.categoryName?.trim().length
          ? item.categoryName.trim()
          : locale === "bg"
            ? "Без категория"
            : "Uncategorized";
      const key = item.categoryId ?? `${label}:${item.categoryEmoji ?? ""}`;
      const existing = breakdown.get(key);

      if (existing) {
        existing.amount += item.amount;
        existing.count += 1;
        continue;
      }

      breakdown.set(key, {
        key,
        label,
        emoji: item.categoryEmoji,
        amount: item.amount,
        count: 1,
        color: PIE_COLORS[breakdown.size % PIE_COLORS.length],
      });
    }
  }

  return Array.from(breakdown.values()).sort((left, right) => right.amount - left.amount);
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

  const monthLabels = useMemo(
    () => ({
      summaryTitle: locale === "bg" ? "Месечен преглед" : "Monthly overview",
      summaryDesc:
        locale === "bg"
          ? "Бърз преглед на оборота, печалбата, труда и разходите за избрания месец."
          : "A quick look at turnover, profit, labor, and expenses for the selected month.",
      expenseTitle: locale === "bg" ? "Разходи по категории" : "Expense breakdown",
      expenseDesc:
        locale === "bg"
          ? "Пай графика показва как се разпределят категоризираните разходи."
          : "The pie chart shows how categorized expenses are distributed.",
      expenseEmpty:
        locale === "bg"
          ? "Няма категоризирани разходи за този месец."
          : "No categorized expenses have been logged for this month yet.",
      expenseHint:
        locale === "bg"
          ? "Добави разходи от Today или Telegram, за да се появят в графиката."
          : "Add expenses from Today or Telegram to see the chart fill up.",
      telegramTitle:
        locale === "bg" ? "Конфигурирай Telegram" : "Configure Telegram",
      telegramDesc:
        locale === "bg"
          ? "Свържи Telegram, за да записваш разходи, да получаваш дневни обобщения и да задаваш въпроси за бизнеса."
          : "Connect Telegram for expense capture, daily summaries, and ops questions.",
      telegramConnect:
        locale === "bg" ? "Свържи в Telegram" : "Connect in Telegram",
      telegramLinked:
        locale === "bg"
          ? `${telegramLinkedUsersCount} свързан(и) Telegram акаунт(а)`
          : `${telegramLinkedUsersCount} linked Telegram account(s)`,
      telegramHint:
        locale === "bg"
          ? "Бутонът отваря бота с еднократен токен за този ресторант."
          : "The button opens the bot with a one-time token for this restaurant.",
      telegramCommands:
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

  const expenseBreakdown = useMemo(
    () => buildExpenseBreakdown(selectedMonthReports, locale),
    [selectedMonthReports, locale],
  );

  const monthLabel = formatMonthLabel(selectedMonth, locale);
  const laborCostRisk = stats.laborCostPercentage > 30;
  const dataModeLabel = dataMode === "demo" ? t.profile.dataDemo : t.profile.dataLive;
  const categorizedExpenseTotal = expenseBreakdown.reduce((sum, item) => sum + item.amount, 0);

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

      {telegramConnectUrl && env.telegramBotUsername ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Send className="size-4" />
              </div>
              <div>
                <CardTitle>{monthLabels.telegramTitle}</CardTitle>
                <CardDescription>{monthLabels.telegramDesc}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border bg-background/80 p-4 text-sm text-muted-foreground">
              <p>{monthLabels.telegramLinked}</p>
              <p className="mt-1">{monthLabels.telegramHint}</p>
              <p className="mt-2 font-medium text-foreground">{monthLabels.telegramCommands}</p>
            </div>
            <a href={telegramConnectUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="default" className="w-full">
                <Send className="size-4" />
                {monthLabels.telegramConnect}
              </Button>
            </a>
          </CardContent>
        </Card>
      ) : null}

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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{monthLabels.expenseTitle}</CardTitle>
            <CardDescription>{monthLabels.expenseDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="h-72 rounded-2xl border border-border bg-muted/30 p-3">
                {expenseBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        formatter={(value, name) => [
                          formatCurrencyPair(toFiniteNumber(value)),
                          String(name),
                        ]}
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "1px solid var(--border)",
                          fontSize: "0.8rem",
                        }}
                      />
                      <Pie
                        data={expenseBreakdown}
                        dataKey="amount"
                        nameKey="label"
                        innerRadius={66}
                        outerRadius={108}
                        paddingAngle={2}
                        stroke="var(--background)"
                      >
                        {expenseBreakdown.map((slice) => (
                          <Cell key={slice.key} fill={slice.color} />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        height={24}
                        formatter={(value) => (
                          <span className="text-xs text-muted-foreground">{String(value)}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background px-6 text-center">
                    <p className="text-sm font-medium text-foreground">{monthLabels.expenseEmpty}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{monthLabels.expenseHint}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {locale === "bg" ? "Категоризирани разходи" : "Categorized expenses"}
                  </p>
                  <MoneyDisplay amount={categorizedExpenseTotal} className="mt-2 text-2xl" />
                </div>

                <div className="space-y-2">
                  {expenseBreakdown.length > 0 ? (
                    expenseBreakdown.map((slice) => {
                      const share =
                        categorizedExpenseTotal > 0
                          ? Math.round((slice.amount / categorizedExpenseTotal) * 100)
                          : 0;

                      return (
                        <div
                          key={slice.key}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="size-3 shrink-0 rounded-full"
                              style={{ backgroundColor: slice.color }}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {slice.emoji ? `${slice.emoji} ` : ""}
                                {slice.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {slice.count} {locale === "bg" ? "записа" : "item(s)"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <MoneyDisplay amount={slice.amount} className="text-sm" />
                            <p className="text-xs text-muted-foreground">{share}%</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      {monthLabels.expenseHint}
                    </div>
                  )}
                </div>
              </div>
            </div>
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

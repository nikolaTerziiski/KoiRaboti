"use client";

import { useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  BarChart3,
  Bot,
  ChartPie,
  CircleAlert,
  LogOut,
  Send,
  UserRound,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MoneyDisplay } from "@/components/ui/money-display";
import { SelectField } from "@/components/ui/select-field";
import { formatCurrencyPair, formatMonthLabel } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";
import { calculateMonthStats, type MonthStats } from "@/lib/profile-stats";
import type { DailyReportWithAttendance, Profile, Restaurant, SnapshotMode } from "@/lib/types";
import { cn } from "@/lib/utils";

type TelegramConfigState = "connectable" | "missing_public_username" | "not_configured";
type ProfileSectionId = "overview" | "expenses" | "telegram" | "account";

type ProfilePageClientProps = {
  reports: DailyReportWithAttendance[];
  profile: Profile | null;
  restaurant: Restaurant | null;
  dataMode: SnapshotMode;
  telegramConnectUrl: string | null;
  telegramLinkedUsersCount: number;
  telegramConfigState: TelegramConfigState;
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
  "color-mix(in srgb, var(--primary) 55%, var(--warning))",
  "color-mix(in srgb, var(--success) 70%, white)",
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
  telegramConfigState,
}: ProfilePageClientProps) {
  const { t, locale } = useLocale();
  const currentMonthKey = getCurrentMonthKey();
  const monthOptions = useMemo(() => {
    const months = new Set(reports.map((report) => `${report.workDate.slice(0, 7)}-01`));
    months.add(currentMonthKey);

    return Array.from(months).sort((left, right) => right.localeCompare(left));
  }, [currentMonthKey, reports]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [activeSection, setActiveSection] = useState<ProfileSectionId>(
    telegramConfigState === "connectable" ? "overview" : "telegram",
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

  const monthLabels = useMemo(
    () => ({
      overviewTitle: locale === "bg" ? "Статистики" : "Overview",
      expensesTitle: locale === "bg" ? "Разходи" : "Expenses",
      telegramNavTitle: "Telegram",
      accountTitle: locale === "bg" ? "Профил" : "Account",
      summaryTitle: locale === "bg" ? "Месечен контролен център" : "Monthly control center",
      summaryDesc:
        locale === "bg"
          ? "Профилът вече е подреден като dashboard с вътрешна навигация за статистики, разходи, Telegram и акаунт."
          : "Your profile is now structured as a dashboard for stats, expenses, Telegram, and account details.",
      recordedDays: locale === "bg" ? "Дни с отчет" : "Recorded days",
      totalExpenses: locale === "bg" ? "Общо разходи" : "Total expenses",
      averageDailyNet: locale === "bg" ? "Средна дневна печалба" : "Average daily net",
      topCategory: locale === "bg" ? "Водеща категория" : "Top category",
      noCategoryLeader:
        locale === "bg" ? "Още няма водеща категория" : "No leading category yet",
      expenseTitle: locale === "bg" ? "Разходи по категории" : "Expense breakdown",
      expenseDesc:
        locale === "bg"
          ? "Донът графиката и разбивката вдясно показват къде отиват парите през избрания месец."
          : "The donut chart and the breakdown show where money goes during the selected month.",
      expenseEmpty:
        locale === "bg"
          ? "Няма категоризирани разходи за този месец."
          : "No categorized expenses have been logged for this month yet.",
      expenseHint:
        locale === "bg"
          ? "Добави разходи от Today или Telegram, за да се появят тук."
          : "Add expenses from Today or Telegram to see the chart fill up.",
      categorizedExpenseTitle:
        locale === "bg" ? "Категоризирани разходи" : "Categorized expenses",
      coverageTitle:
        locale === "bg" ? "Покритие на категориите" : "Category coverage",
      coverageHint:
        locale === "bg"
          ? "Каква част от всички разходи вече е разпределена по категории."
          : "How much of total expenses is already categorized.",
      expenseRecords: locale === "bg" ? "записа" : "records",
      telegramTitle:
        locale === "bg" ? "Конфигурирай Telegram" : "Configure Telegram",
      telegramDesc:
        locale === "bg"
          ? "Свържи Telegram, за да записваш разходи, да получаваш дневни обобщения и да задаваш въпроси за бизнеса."
          : "Connect Telegram for expense capture, daily summaries, and ops questions.",
      telegramReady:
        locale === "bg" ? "Готово за свързване" : "Ready to connect",
      telegramMissingUsername:
        locale === "bg"
          ? "Липсва публичният bot username"
          : "Missing public bot username",
      telegramUnavailable:
        locale === "bg" ? "Telegram не е довършен" : "Telegram is not fully configured",
      telegramConnect:
        locale === "bg" ? "Отвори и свържи бота" : "Open and connect the bot",
      telegramLinked:
        locale === "bg"
          ? `${telegramLinkedUsersCount} свързан(и) Telegram акаунт(а)`
          : `${telegramLinkedUsersCount} linked Telegram account(s)`,
      telegramHint:
        locale === "bg"
          ? "Бутонът отваря бота с еднократен токен за този ресторант."
          : "The button opens the bot with a one-time token for this restaurant.",
      telegramMissingUsernameHint:
        locale === "bg"
          ? "Добави NEXT_PUBLIC_TELEGRAM_BOT_USERNAME в .env.local, за да се покаже бутонът за свързване."
          : "Add NEXT_PUBLIC_TELEGRAM_BOT_USERNAME to .env.local to show the connect button.",
      telegramUnavailableHint:
        locale === "bg"
          ? "Провери Telegram env променливите. Профилът ще покаже бутона веднага щом username-ът стане публичен."
          : "Check the Telegram env vars. The Profile page will show the button once the public username becomes available.",
      telegramCommands:
        locale === "bg"
          ? "Полезни команди: /summary, /categories, /daily_on, /daily_off"
          : "Useful commands: /summary, /categories, /daily_on, /daily_off",
      telegramStep1:
        locale === "bg"
          ? "Отвори бота от бутона по-долу."
          : "Open the bot from the button below.",
      telegramStep2:
        locale === "bg"
          ? "Потвърди връзката с еднократния токен."
          : "Confirm the link with the one-time token.",
      telegramStep3:
        locale === "bg"
          ? "После можеш да добавяш разходи и да получаваш дневни обобщения."
          : "Then you can add expenses and receive daily summaries.",
      laborHealthy: locale === "bg" ? "В норма" : "Healthy",
      laborWatch: locale === "bg" ? "Иска внимание" : "Needs attention",
    }),
    [locale, telegramLinkedUsersCount],
  );

  const monthLabel = formatMonthLabel(selectedMonth, locale);
  const laborCostRisk = stats.laborCostPercentage > 30;
  const dataModeLabel = dataMode === "demo" ? t.profile.dataDemo : t.profile.dataLive;
  const categorizedExpenseTotal = expenseBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const categoryCoverage =
    stats.totalExpense > 0 ? Math.min((categorizedExpenseTotal / stats.totalExpense) * 100, 100) : 0;
  const expenseLeader = expenseBreakdown[0] ?? null;

  const metrics = [
    {
      label: t.profile.totalTurnover,
      value: stats.totalTurnover,
      className: "border-primary/15 bg-primary/5",
    },
    {
      label: t.profile.netProfit,
      value: stats.netProfit,
      className:
        stats.netProfit >= 0
          ? "border-success/15 bg-success/5"
          : "border-destructive/20 bg-destructive/5",
    },
    {
      label: monthLabels.totalExpenses,
      value: stats.totalExpense,
      className: "border-sky-500/20 bg-sky-500/10",
    },
    {
      label: t.profile.averageDailyTurnover,
      value: stats.averageDailyTurnover,
      className: "border-warning/20 bg-warning/10",
    },
    {
      label: t.profile.laborCost,
      value: stats.totalLaborCost,
      className: "border-border bg-muted/60",
    },
  ];

  const sectionItems = [
    {
      id: "overview" as const,
      label: monthLabels.overviewTitle,
      icon: BarChart3,
      activeClass: "bg-primary text-primary-foreground shadow-sm",
    },
    {
      id: "expenses" as const,
      label: monthLabels.expensesTitle,
      icon: ChartPie,
      activeClass: "bg-sky-500/15 text-sky-700",
    },
    {
      id: "telegram" as const,
      label: monthLabels.telegramNavTitle,
      icon: Bot,
      activeClass: "bg-success/15 text-success",
    },
    {
      id: "account" as const,
      label: monthLabels.accountTitle,
      icon: UserRound,
      activeClass: "bg-warning/15 text-warning",
    },
  ];

  const telegramBadgeVariant =
    telegramConfigState === "connectable"
      ? "success"
      : telegramConfigState === "missing_public_username"
        ? "warning"
        : "outline";

  const telegramStatusTitle =
    telegramConfigState === "connectable"
      ? monthLabels.telegramReady
      : telegramConfigState === "missing_public_username"
        ? monthLabels.telegramMissingUsername
        : monthLabels.telegramUnavailable;

  const telegramStatusHint =
    telegramConfigState === "connectable"
      ? monthLabels.telegramLinked
      : telegramConfigState === "missing_public_username"
        ? monthLabels.telegramMissingUsernameHint
        : monthLabels.telegramUnavailableHint;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-background to-warning/10">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={dataMode === "demo" ? "outline" : "success"}>{dataModeLabel}</Badge>
              <Badge variant="outline">
                {selectedMonthReports.length > 0
                  ? `${selectedMonthReports.length} ${t.profile.reportsSummary}`
                  : t.profile.noReports}
              </Badge>
              <Badge variant={telegramBadgeVariant}>{telegramStatusTitle}</Badge>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-primary">{monthLabels.summaryTitle}</p>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {t.profile.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {monthLabels.summaryDesc}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-primary/15 bg-background/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.profile.totalTurnover}
                </p>
                <MoneyDisplay amount={stats.totalTurnover} className="mt-2 text-2xl" compact />
              </div>
              <div className="rounded-2xl border border-success/15 bg-background/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.profile.netProfit}
                </p>
                <MoneyDisplay amount={stats.netProfit} className="mt-2 text-2xl" compact />
              </div>
              <div className="rounded-2xl border border-sky-500/20 bg-background/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {monthLabels.totalExpenses}
                </p>
                <MoneyDisplay amount={stats.totalExpense} className="mt-2 text-2xl" compact />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/90 p-4 backdrop-blur">
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

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-border bg-muted/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {monthLabel}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{dataModeLabel}</p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {monthLabels.recordedDays}
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{stats.recordedDays}</p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {monthLabels.topCategory}
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {expenseLeader
                    ? `${expenseLeader.emoji ? `${expenseLeader.emoji} ` : ""}${expenseLeader.label}`
                    : monthLabels.noCategoryLeader}
                </p>
                {expenseLeader ? (
                  <MoneyDisplay amount={expenseLeader.amount} className="mt-2" compact />
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">{monthLabels.expenseHint}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="sticky top-3 z-10 rounded-2xl border border-border/80 bg-background/95 p-2 shadow-sm backdrop-blur">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {sectionItems.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                  isActive
                    ? section.activeClass
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeSection === "overview" ? (
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <Card key={metric.label} className={metric.className}>
                <CardHeader className="pb-2">
                  <CardDescription>{metric.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <MoneyDisplay amount={metric.value} className="text-3xl" />
                </CardContent>
              </Card>
            ))}

            <Card className={cn(laborCostRisk ? "border-destructive/20 bg-destructive/5" : "bg-muted/50")}>
              <CardHeader className="pb-2">
                <CardDescription>{t.profile.laborCostPercentage}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <p
                    className={cn(
                      "text-3xl font-semibold",
                      laborCostRisk ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {stats.laborCostPercentage.toFixed(1)}%
                  </p>
                  <Badge variant={laborCostRisk ? "warning" : "success"}>
                    {laborCostRisk ? monthLabels.laborWatch : monthLabels.laborHealthy}
                  </Badge>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      laborCostRisk ? "bg-destructive" : "bg-success",
                    )}
                    style={{ width: `${Math.min(stats.laborCostPercentage, 100)}%` }}
                  />
                </div>
                {laborCostRisk ? (
                  <p className="text-xs text-destructive">{t.profile.laborCostWarning}</p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="border-sky-500/20 bg-sky-500/5">
            <CardHeader>
              <CardTitle>{monthLabels.telegramTitle}</CardTitle>
              <CardDescription>{telegramStatusHint}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <Badge variant={telegramBadgeVariant}>{telegramStatusTitle}</Badge>
              <button
                type="button"
                onClick={() => setActiveSection("telegram")}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                <Send className="size-4" />
                {monthLabels.telegramTitle}
              </button>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeSection === "expenses" ? (
        <section className="space-y-4">
          <Card className="overflow-hidden border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-background to-primary/5">
            <CardHeader>
              <CardTitle>{monthLabels.expenseTitle}</CardTitle>
              <CardDescription>{monthLabels.expenseDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-2xl border border-border bg-background/85 p-4">
                {expenseBreakdown.length > 0 ? (
                  <div className="relative mx-auto h-[320px] w-full max-w-[360px]">
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
                          innerRadius={78}
                          outerRadius={116}
                          paddingAngle={3}
                          stroke="var(--background)"
                          strokeWidth={5}
                        >
                          {expenseBreakdown.map((slice) => (
                            <Cell key={slice.key} fill={slice.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {monthLabels.categorizedExpenseTitle}
                      </p>
                      <MoneyDisplay amount={categorizedExpenseTotal} className="mt-2 text-2xl" />
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 text-center">
                    <p className="text-sm font-medium text-foreground">{monthLabels.expenseEmpty}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{monthLabels.expenseHint}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-background/85 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {monthLabels.coverageTitle}
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${categoryCoverage}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{monthLabels.coverageHint}</p>
                </div>

                {expenseBreakdown.length > 0 ? (
                  expenseBreakdown.map((slice) => {
                    const share =
                      categorizedExpenseTotal > 0
                        ? Math.round((slice.amount / categorizedExpenseTotal) * 100)
                        : 0;

                    return (
                      <div
                        key={slice.key}
                        className="rounded-2xl border border-border bg-background/85 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="size-3 shrink-0 rounded-full"
                                style={{ backgroundColor: slice.color }}
                              />
                              <p className="truncate text-sm font-semibold text-foreground">
                                {slice.emoji ? `${slice.emoji} ` : ""}
                                {slice.label}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {slice.count} {monthLabels.expenseRecords}
                            </p>
                          </div>
                          <MoneyDisplay amount={slice.amount} align="end" />
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${share}%`, backgroundColor: slice.color }}
                          />
                        </div>
                        <p className="mt-2 text-right text-xs text-muted-foreground">{share}%</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-background/85 p-4 text-sm text-muted-foreground">
                    {monthLabels.expenseHint}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeSection === "telegram" ? (
        <section className="space-y-4">
          <Card className="overflow-hidden border-success/20 bg-gradient-to-br from-success/10 via-background to-primary/5">
            <CardHeader>
              <CardTitle>{monthLabels.telegramTitle}</CardTitle>
              <CardDescription>{monthLabels.telegramDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_320px]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-background/85 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={telegramBadgeVariant}>{telegramStatusTitle}</Badge>
                    {telegramLinkedUsersCount > 0 ? (
                      <Badge variant="success">{monthLabels.telegramLinked}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{telegramStatusHint}</p>
                </div>

                <div className="rounded-2xl border border-border bg-background/85 p-4">
                  <p className="text-sm font-semibold text-foreground">{monthLabels.telegramCommands}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">/summary</Badge>
                    <Badge variant="outline">/categories</Badge>
                    <Badge variant="outline">/daily_on</Badge>
                    <Badge variant="outline">/daily_off</Badge>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/85 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-warning/15 p-2 text-warning">
                      <CircleAlert className="size-4" />
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>{monthLabels.telegramStep1}</p>
                      <p>{monthLabels.telegramStep2}</p>
                      <p>{monthLabels.telegramStep3}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/90 p-4">
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Telegram
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{telegramStatusTitle}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{telegramStatusHint}</p>
                </div>

                <div className="mt-4 space-y-3">
                  {telegramConnectUrl ? (
                    <Button asChild className="w-full">
                      <a href={telegramConnectUrl} target="_blank" rel="noopener noreferrer">
                        <Send className="size-4" />
                        {monthLabels.telegramConnect}
                      </a>
                    </Button>
                  ) : null}

                  {telegramConfigState === "connectable" ? (
                    <div className="rounded-2xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                      {monthLabels.telegramHint}
                    </div>
                  ) : null}

                  {telegramConfigState === "missing_public_username" ? (
                    <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
                      <p className="font-semibold">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</p>
                      <p className="mt-2">{monthLabels.telegramMissingUsernameHint}</p>
                    </div>
                  ) : null}

                  {telegramConfigState === "not_configured" ? (
                    <div className="rounded-2xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                      {monthLabels.telegramUnavailableHint}
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeSection === "account" ? (
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
      ) : null}
    </div>
  );
}

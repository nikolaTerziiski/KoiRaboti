"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { eurToBgn, formatMonthLabel } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";
import type {
  DailyReportWithAttendance,
  Employee,
  ExpenseCategory,
  SnapshotMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type ReportsPageClientProps = {
  employees: Employee[];
  expenseCategories: ExpenseCategory[];
  reports: DailyReportWithAttendance[];
  dataMode: SnapshotMode;
};

type TrendTone = "positive" | "negative" | "neutral";
type TrendDirection = "up" | "down";

type TrendInfo = {
  label: string;
  tone: TrendTone;
  direction: TrendDirection;
};

type MetricCardData = {
  title: string;
  valueLabel: string;
  trend: TrendInfo;
  helperText: string;
  icon: LucideIcon;
  accentClassName: string;
};

type ExpenseSegment = {
  name: string;
  value: number;
  share: number;
  color: string;
  toneClassName: string;
};

type WeeklyPoint = {
  name: string;
  revenue: number;
  expenses: number;
};

type DashboardCopy = {
  title: string;
  subtitle: string;
  monthAriaLabel: string;
  demoBadge: string;
  liveBadge: string;
  comparePrefix: string;
  noBaseline: string;
  noBaselineHint: string;
  selectedMonthHint: string;
  kpis: {
    revenue: string;
    expenses: string;
    netProfit: string;
  };
  kpiHints: {
    revenue: string;
    expenses: string;
    netProfit: string;
  };
  charts: {
    expenseDistribution: string;
    expenseDistributionDesc: string;
    totalExpenses: string;
    revenueVsExpenses: string;
    revenueVsExpensesDesc: string;
  };
  legend: {
    revenue: string;
    expenses: string;
  };
  mockCategories: {
    payroll: string;
    food: string;
    utilities: string;
    rent: string;
    other: string;
  };
  weeks: [string, string, string, string];
};

type AnalyticsTooltipProps = {
  active?: boolean;
  payload?: Array<{
    color?: string;
    dataKey?: string | number;
    name?: string;
    value?: number;
  }>;
  label?: string;
};

const CHART_COLORS = [
  "var(--color-emerald-500)",
  "var(--color-sky-500)",
  "var(--color-amber-500)",
  "var(--color-slate-400)",
];

const SEGMENT_TONE_CLASSES = [
  "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
];

const mockRevenueBgn = 42500;
const mockExpensesBgn = 28400;
const mockNetProfitBgn = 14100;

const wholeBgnFormatter = new Intl.NumberFormat("bg-BG", {
  style: "currency",
  currency: "BGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const compactBgnFormatter = new Intl.NumberFormat("bg-BG", {
  style: "currency",
  currency: "BGN",
  notation: "compact",
  maximumFractionDigits: 1,
});

const compactNumberFormatter = new Intl.NumberFormat("bg-BG", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatBgnValue(value: number) {
  return wholeBgnFormatter.format(value);
}

function formatCompactBgnValue(value: number) {
  return compactBgnFormatter.format(value);
}

function formatCompactAxisValue(value: number) {
  return compactNumberFormatter.format(value);
}

function getCurrentMonthValue() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${today.getFullYear()}-${month}-01`;
}

function getMonthOptions(reports: DailyReportWithAttendance[]) {
  return Array.from(
    new Set(reports.map((report) => `${report.workDate.slice(0, 7)}-01`)),
  ).sort((left, right) => right.localeCompare(left));
}

function getMonthReports(
  reports: DailyReportWithAttendance[],
  monthValue: string,
) {
  return reports.filter((report) =>
    report.workDate.startsWith(monthValue.slice(0, 7)),
  );
}

function getReportExpenseTotal(report: DailyReportWithAttendance) {
  const itemTotal = report.expenseItems.reduce((sum, item) => sum + item.amount, 0);
  return itemTotal > 0 ? itemTotal : report.manualExpense;
}

function buildTrendInfo(
  currentValue: number,
  previousValue: number,
  lowerIsBetter: boolean,
  copy: DashboardCopy,
): TrendInfo {
  if (previousValue <= 0) {
    return {
      label: copy.noBaseline,
      tone: "neutral",
      direction: "up",
    };
  }

  const delta = ((currentValue - previousValue) / previousValue) * 100;
  const tone: TrendTone = lowerIsBetter
    ? delta <= 0
      ? "positive"
      : "negative"
    : delta >= 0
      ? "positive"
      : "negative";

  return {
    label: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`,
    tone,
    direction: delta < 0 ? "down" : "up",
  };
}

function buildMockExpenseDistribution(copy: DashboardCopy): ExpenseSegment[] {
  const distribution = [
    {
      name: copy.mockCategories.payroll,
      value: mockExpensesBgn * 0.45,
    },
    {
      name: copy.mockCategories.food,
      value: mockExpensesBgn * 0.3,
    },
    {
      name: copy.mockCategories.utilities,
      value: mockExpensesBgn * 0.15,
    },
    {
      name: copy.mockCategories.rent,
      value: mockExpensesBgn * 0.1,
    },
  ];

  return distribution.map((segment, index) => ({
    ...segment,
    share: Number(((segment.value / mockExpensesBgn) * 100).toFixed(1)),
    color: CHART_COLORS[index] ?? CHART_COLORS[CHART_COLORS.length - 1],
    toneClassName:
      SEGMENT_TONE_CLASSES[index] ??
      SEGMENT_TONE_CLASSES[SEGMENT_TONE_CLASSES.length - 1],
  }));
}

function buildExpenseDistribution(
  reports: DailyReportWithAttendance[],
  copy: DashboardCopy,
) {
  const totals = new Map<string, number>();

  for (const report of reports) {
    if (report.expenseItems.length > 0) {
      for (const item of report.expenseItems) {
        const label = item.categoryName?.trim() || copy.mockCategories.other;
        const currentValue = totals.get(label) ?? 0;
        totals.set(label, currentValue + eurToBgn(item.amount));
      }
      continue;
    }

    if (report.manualExpense > 0) {
      const currentValue = totals.get(copy.mockCategories.other) ?? 0;
      totals.set(
        copy.mockCategories.other,
        currentValue + eurToBgn(report.manualExpense),
      );
    }
  }

  if (totals.size < 2) {
    return buildMockExpenseDistribution(copy);
  }

  const sortedSegments = Array.from(totals.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);
  const totalValue = sortedSegments.reduce((sum, [, value]) => sum + value, 0);

  return sortedSegments.map(([name, value], index) => ({
    name,
    value,
    share: totalValue > 0 ? Number(((value / totalValue) * 100).toFixed(1)) : 0,
    color: CHART_COLORS[index] ?? CHART_COLORS[CHART_COLORS.length - 1],
    toneClassName:
      SEGMENT_TONE_CLASSES[index] ??
      SEGMENT_TONE_CLASSES[SEGMENT_TONE_CLASSES.length - 1],
  }));
}

function buildMockWeeklyTrend(copy: DashboardCopy): WeeklyPoint[] {
  return [
    { name: copy.weeks[0], revenue: 9800, expenses: 6500 },
    { name: copy.weeks[1], revenue: 11100, expenses: 7000 },
    { name: copy.weeks[2], revenue: 10300, expenses: 6900 },
    { name: copy.weeks[3], revenue: 11300, expenses: 8000 },
  ];
}

function buildWeeklyTrend(
  reports: DailyReportWithAttendance[],
  copy: DashboardCopy,
) {
  const buckets = [
    { label: copy.weeks[0], from: 1, to: 7 },
    { label: copy.weeks[1], from: 8, to: 14 },
    { label: copy.weeks[2], from: 15, to: 21 },
    { label: copy.weeks[3], from: 22, to: 31 },
  ];

  const weeklyRows = buckets.map((bucket) => {
    const bucketReports = reports.filter((report) => {
      const day = Number(report.workDate.slice(8, 10));
      return day >= bucket.from && day <= bucket.to;
    });

    return {
      name: bucket.label,
      revenue: eurToBgn(
        bucketReports.reduce((sum, report) => sum + report.turnover, 0),
      ),
      expenses: eurToBgn(
        bucketReports.reduce((sum, report) => sum + getReportExpenseTotal(report), 0),
      ),
    };
  });

  const hasSignal = weeklyRows.some(
    (row) => row.revenue > 0 || row.expenses > 0,
  );

  return hasSignal ? weeklyRows : buildMockWeeklyTrend(copy);
}

function buildMockMetricCards(copy: DashboardCopy): MetricCardData[] {
  return [
    {
      title: copy.kpis.revenue,
      valueLabel: formatBgnValue(mockRevenueBgn),
      trend: { label: "+12.5%", tone: "positive", direction: "up" },
      helperText: copy.kpiHints.revenue,
      icon: Wallet,
      accentClassName:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    {
      title: copy.kpis.expenses,
      valueLabel: formatBgnValue(mockExpensesBgn),
      trend: { label: "-2.4%", tone: "positive", direction: "down" },
      helperText: copy.kpiHints.expenses,
      icon: PieChartIcon,
      accentClassName:
        "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      title: copy.kpis.netProfit,
      valueLabel: formatBgnValue(mockNetProfitBgn),
      trend: { label: "+8.1%", tone: "positive", direction: "up" },
      helperText: copy.kpiHints.netProfit,
      icon: BarChart3,
      accentClassName:
        "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    },
  ];
}

function buildMetricCards(
  visibleReports: DailyReportWithAttendance[],
  previousReports: DailyReportWithAttendance[],
  copy: DashboardCopy,
  monthLabel: string,
  previousMonthLabel: string | null,
) {
  const currentRevenue = eurToBgn(
    visibleReports.reduce((sum, report) => sum + report.turnover, 0),
  );
  const currentExpenses = eurToBgn(
    visibleReports.reduce((sum, report) => sum + getReportExpenseTotal(report), 0),
  );
  const currentNetProfit = eurToBgn(
    visibleReports.reduce(
      (sum, report) => sum + (report.profit - getReportExpenseTotal(report)),
      0,
    ),
  );

  const previousRevenue = eurToBgn(
    previousReports.reduce((sum, report) => sum + report.turnover, 0),
  );
  const previousExpenses = eurToBgn(
    previousReports.reduce((sum, report) => sum + getReportExpenseTotal(report), 0),
  );
  const previousNetProfit = eurToBgn(
    previousReports.reduce(
      (sum, report) => sum + (report.profit - getReportExpenseTotal(report)),
      0,
    ),
  );

  const comparisonLabel = previousMonthLabel
    ? `${copy.comparePrefix} ${previousMonthLabel}`
    : copy.noBaselineHint;

  return [
    {
      title: copy.kpis.revenue,
      valueLabel: formatBgnValue(currentRevenue),
      trend: buildTrendInfo(currentRevenue, previousRevenue, false, copy),
      helperText: `${copy.selectedMonthHint} ${monthLabel}`,
      icon: Wallet,
      accentClassName:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    {
      title: copy.kpis.expenses,
      valueLabel: formatBgnValue(currentExpenses),
      trend: buildTrendInfo(currentExpenses, previousExpenses, true, copy),
      helperText: comparisonLabel,
      icon: PieChartIcon,
      accentClassName:
        "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      title: copy.kpis.netProfit,
      valueLabel: formatBgnValue(currentNetProfit),
      trend: buildTrendInfo(currentNetProfit, previousNetProfit, false, copy),
      helperText: comparisonLabel,
      icon: BarChart3,
      accentClassName:
        "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    },
  ];
}

function TrendBadge({ trend }: { trend: TrendInfo }) {
  const Icon = trend.direction === "down" ? TrendingDown : TrendingUp;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        trend.tone === "positive" &&
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        trend.tone === "negative" &&
          "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
        trend.tone === "neutral" &&
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      <Icon className="size-3.5" />
      {trend.label}
    </span>
  );
}

function MetricCard({ metric }: { metric: MetricCardData }) {
  const Icon = metric.icon;

  return (
    <article className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-2xl",
            metric.accentClassName,
          )}
        >
          <Icon className="size-5" />
        </div>
        <TrendBadge trend={metric.trend} />
      </div>

      <div className="mt-6 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {metric.title}
        </p>
        <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {metric.valueLabel}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {metric.helperText}
        </p>
      </div>
    </article>
  );
}

function AnalyticsTooltip({
  active,
  payload,
  label,
}: AnalyticsTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="min-w-44 rounded-2xl border border-slate-200/60 bg-white px-4 py-3 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      {label ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
      ) : null}

      <div className="space-y-2">
        {payload.map((entry) => (
          <div
            key={`${entry.dataKey}-${entry.name}`}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}</span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatBgnValue(entry.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportsPageClient({
  reports,
  dataMode,
}: ReportsPageClientProps) {
  const { locale } = useLocale();
  const monthOptions = getMonthOptions(reports);
  const fallbackMonth = monthOptions[0] ?? getCurrentMonthValue();
  const [selectedMonth, setSelectedMonth] = useState(fallbackMonth);

  const copy: DashboardCopy =
    locale === "bg"
      ? {
          title: "Отчети",
          subtitle: "Финансови анализи и разпределение на разходите",
          monthAriaLabel: "Избери месец",
          demoBadge: "Примерен анализ",
          liveBadge: "Актуални данни",
          comparePrefix: "Спрямо",
          noBaseline: "Няма база",
          noBaselineHint: "Няма предходен месец за сравнение",
          selectedMonthHint: "Данни за",
          kpis: {
            revenue: "Оборот",
            expenses: "Разходи",
            netProfit: "Печалба",
          },
          kpiHints: {
            revenue: "Силен месечен темп при продажбите",
            expenses: "По-ниските разходи работят в твоя полза",
            netProfit: "Нетен резултат след разходите",
          },
          charts: {
            expenseDistribution: "Разпределение на разходите",
            expenseDistributionDesc:
              "Категории и относителен дял за избрания месец.",
            totalExpenses: "Общо разходи",
            revenueVsExpenses: "Оборот спрямо Разходи",
            revenueVsExpensesDesc:
              "Сравнение по седмици за избрания месец.",
          },
          legend: {
            revenue: "Оборот",
            expenses: "Разходи",
          },
          mockCategories: {
            payroll: "Персонал",
            food: "Храна",
            utilities: "Комунални",
            rent: "Наем",
            other: "Други",
          },
          weeks: ["Седм. 1", "Седм. 2", "Седм. 3", "Седм. 4"],
        }
      : {
          title: "Reports",
          subtitle: "Financial analytics and expense allocation",
          monthAriaLabel: "Select month",
          demoBadge: "Sample analytics",
          liveBadge: "Live data",
          comparePrefix: "Compared to",
          noBaseline: "No baseline",
          noBaselineHint: "No previous month available for comparison",
          selectedMonthHint: "Data for",
          kpis: {
            revenue: "Revenue",
            expenses: "Expenses",
            netProfit: "Net Profit",
          },
          kpiHints: {
            revenue: "Healthy monthly pace across sales",
            expenses: "Lower operating costs support margin growth",
            netProfit: "Net outcome after operational costs",
          },
          charts: {
            expenseDistribution: "Expense Distribution",
            expenseDistributionDesc:
              "Categories and relative share for the selected month.",
            totalExpenses: "Total expenses",
            revenueVsExpenses: "Revenue vs Expenses",
            revenueVsExpensesDesc:
              "Weekly comparison across the selected month.",
          },
          legend: {
            revenue: "Revenue",
            expenses: "Expenses",
          },
          mockCategories: {
            payroll: "Payroll",
            food: "Food",
            utilities: "Utilities",
            rent: "Rent",
            other: "Other",
          },
          weeks: ["Week 1", "Week 2", "Week 3", "Week 4"],
        };

  const activeMonth = monthOptions.includes(selectedMonth)
    ? selectedMonth
    : fallbackMonth;
  const visibleReports = getMonthReports(reports, activeMonth);
  const selectedMonthIndex = monthOptions.indexOf(activeMonth);
  const previousMonth =
    selectedMonthIndex >= 0 ? monthOptions[selectedMonthIndex + 1] ?? null : null;
  const previousReports = previousMonth ? getMonthReports(reports, previousMonth) : [];
  const shouldUseMockData = dataMode === "demo" || visibleReports.length === 0;
  const activeMonthLabel = formatMonthLabel(activeMonth, locale);
  const previousMonthLabel = previousMonth
    ? formatMonthLabel(previousMonth, locale)
    : null;

  const metrics = shouldUseMockData
    ? buildMockMetricCards(copy)
    : buildMetricCards(
        visibleReports,
        previousReports,
        copy,
        activeMonthLabel,
        previousMonthLabel,
      );
  const expenseDistribution = shouldUseMockData
    ? buildMockExpenseDistribution(copy)
    : buildExpenseDistribution(visibleReports, copy);
  const weeklyTrend = shouldUseMockData
    ? buildMockWeeklyTrend(copy)
    : buildWeeklyTrend(visibleReports, copy);
  const expenseTotal = expenseDistribution.reduce(
    (sum, segment) => sum + segment.value,
    0,
  );
  const monthChoices = monthOptions.length > 0 ? monthOptions : [fallbackMonth];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 dark:bg-slate-950 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {copy.title}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                  shouldUseMockData
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                )}
              >
                {shouldUseMockData ? copy.demoBadge : copy.liveBadge}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {copy.subtitle}
            </p>
          </div>

          <div className="relative w-full md:w-auto">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <select
              aria-label={copy.monthAriaLabel}
              value={activeMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200/60 bg-white px-11 pr-10 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-emerald-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 md:min-w-56"
            >
              {monthChoices.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month, locale)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} metric={metric} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <PieChartIcon className="size-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {copy.charts.expenseDistribution}
                  </h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {copy.charts.expenseDistributionDesc}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-center">
              <div className="relative h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Pie
                      data={expenseDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={78}
                      outerRadius={110}
                      paddingAngle={3}
                      cornerRadius={12}
                    >
                      {expenseDistribution.map((segment) => (
                        <Cell
                          key={`segment-${segment.name}`}
                          fill={segment.color}
                        />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="space-y-1 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {copy.charts.totalExpenses}
                    </p>
                    <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {formatCompactBgnValue(expenseTotal)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {expenseDistribution.map((segment) => (
                  <div
                    key={segment.name}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50/90 px-4 py-3 dark:bg-slate-950/70"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {segment.name}
                        </p>
                        <span
                          className={cn(
                            "mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                            segment.toneClassName,
                          )}
                        >
                          {segment.share}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {formatBgnValue(segment.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <BarChart3 className="size-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {copy.charts.revenueVsExpenses}
                  </h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {copy.charts.revenueVsExpensesDesc}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500" />
                {copy.legend.revenue}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <span className="size-2 rounded-full bg-blue-500" />
                {copy.legend.expenses}
              </span>
            </div>

            <div className="mt-6 h-[320px] text-slate-300 dark:text-slate-700">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrend} barGap={10}>
                  <defs>
                    <linearGradient
                      id="reports-revenue-gradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="var(--color-emerald-400)" />
                      <stop offset="100%" stopColor="var(--color-emerald-600)" />
                    </linearGradient>
                    <linearGradient
                      id="reports-expenses-gradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="var(--color-sky-400)" />
                      <stop offset="100%" stopColor="var(--color-sky-600)" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    vertical={false}
                    stroke="currentColor"
                    strokeOpacity={0.35}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "currentColor", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    tickFormatter={formatCompactAxisValue}
                  />
                  <Tooltip
                    cursor={{
                      fill: "var(--color-slate-200)",
                      fillOpacity: 0.25,
                    }}
                    content={<AnalyticsTooltip />}
                  />
                  <Bar
                    dataKey="revenue"
                    name={copy.legend.revenue}
                    fill="url(#reports-revenue-gradient)"
                    radius={[10, 10, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="expenses"
                    name={copy.legend.expenses}
                    fill="url(#reports-expenses-gradient)"
                    radius={[10, 10, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

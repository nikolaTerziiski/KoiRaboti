"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { bg, enUS } from "date-fns/locale";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/lib/i18n/context";
import { eurToBgn } from "@/lib/format";
import { resolveAttendanceAmount } from "@/lib/payroll";
import { cn } from "@/lib/utils";
import type { DailyReportWithAttendance } from "@/lib/types";

type TrendsDashboardProps = {
  reports: DailyReportWithAttendance[];
};

type DayPoint = {
  date: string;
  label: string;
  turnover: number;
  profit: number;
  laborCost: number;
  laborPct: number;
  staffCount: number;
};

function buildDayPoints(
  reports: DailyReportWithAttendance[],
  locale: "en" | "bg",
): DayPoint[] {
  const sorted = [...reports].sort((a, b) =>
    a.workDate.localeCompare(b.workDate),
  );

  return sorted.map((report) => {
    const laborCost = report.attendanceEntries.reduce(
      (sum, entry) => sum + resolveAttendanceAmount(entry),
      0,
    );
    const turnoverBgn = eurToBgn(report.turnover);
    const profitBgn = eurToBgn(report.profit);
    const laborCostBgn = eurToBgn(laborCost);

    return {
      date: report.workDate,
      label: format(parseISO(report.workDate), "d MMM", {
        locale: locale === "bg" ? bg : enUS,
      }),
      turnover: Math.round(turnoverBgn),
      profit: Math.round(profitBgn),
      laborCost: Math.round(laborCostBgn),
      laborPct:
        report.turnover > 0
          ? Math.round((laborCost / report.turnover) * 100)
          : 0,
      staffCount: report.attendanceEntries.length,
    };
  });
}

function formatBgn(value: number) {
  return `${value.toLocaleString("bg-BG")} лв`;
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

export function TrendsDashboard({ reports }: TrendsDashboardProps) {
  const { locale } = useLocale();

  const recentReports = useMemo(
    () =>
      [...reports]
        .sort((a, b) => b.workDate.localeCompare(a.workDate))
        .slice(0, 7),
    [reports],
  );

  const points = useMemo(
    () => buildDayPoints(recentReports, locale),
    [recentReports, locale],
  );

  const labels = useMemo(
    () => ({
      title: locale === "bg" ? "Тенденции за 7 дни" : "7-day trends",
      subtitle:
        locale === "bg"
          ? "Оборот, печалба и разход за труд в BGN."
          : "Turnover, profit, and labor cost in BGN.",
      turnover: locale === "bg" ? "Оборот" : "Turnover",
      profit: locale === "bg" ? "Печалба" : "Profit",
      laborCost: locale === "bg" ? "Труд" : "Labor",
      laborPct: locale === "bg" ? "% Труд" : "Labor %",
      avgTurnover:
        locale === "bg" ? "Ср. дневен оборот" : "Avg daily turnover",
      avgProfit: locale === "bg" ? "Ср. дневна печалба" : "Avg daily profit",
      avgLaborPct:
        locale === "bg" ? "Ср. % труд от оборота" : "Avg labor cost %",
      vsYesterday: locale === "bg" ? "спрямо вчера" : "vs yesterday",
      noData:
        locale === "bg"
          ? "Няма достатъчно данни за графиките."
          : "Not enough data for charts.",
    }),
    [locale],
  );

  if (points.length < 2) {
    return null;
  }

  const avgTurnover = Math.round(
    points.reduce((s, p) => s + p.turnover, 0) / points.length,
  );
  const avgProfit = Math.round(
    points.reduce((s, p) => s + p.profit, 0) / points.length,
  );
  const avgLaborPct = Math.round(
    points.reduce((s, p) => s + p.laborPct, 0) / points.length,
  );

  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const turnoverDelta = latest.turnover - previous.turnover;
  const profitDelta = latest.profit - previous.profit;

  const kpis = [
    {
      label: labels.avgTurnover,
      value: formatBgn(avgTurnover),
      delta: turnoverDelta,
      deltaLabel: `${turnoverDelta >= 0 ? "+" : ""}${formatBgn(turnoverDelta)} ${labels.vsYesterday}`,
    },
    {
      label: labels.avgProfit,
      value: formatBgn(avgProfit),
      delta: profitDelta,
      deltaLabel: `${profitDelta >= 0 ? "+" : ""}${formatBgn(profitDelta)} ${labels.vsYesterday}`,
    },
    {
      label: labels.avgLaborPct,
      value: `${avgLaborPct}%`,
      delta: avgLaborPct > 30 ? -1 : 1,
      deltaLabel:
        avgLaborPct > 30
          ? locale === "bg"
            ? "Над 30% праг"
            : "Above 30% threshold"
          : locale === "bg"
            ? "В нормата"
            : "Within target",
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
          <CardDescription>{labels.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl bg-muted p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="mt-2 text-xl font-semibold">{kpi.value}</p>
                <div className="mt-1 flex items-center gap-1">
                  {kpi.delta >= 0 ? (
                    <TrendingUp className="size-3 text-green-600" />
                  ) : (
                    <TrendingDown className="size-3 text-destructive" />
                  )}
                  <p
                    className={cn(
                      "text-xs",
                      kpi.delta >= 0
                        ? "text-green-600"
                        : "text-destructive",
                    )}
                  >
                    {kpi.deltaLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>
            {labels.turnover} & {labels.profit} (BGN)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={points}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatBgn(toFiniteNumber(value)),
                    String(name) === "turnover" ? labels.turnover : labels.profit,
                  ]}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid var(--border)",
                    fontSize: "0.8rem",
                  }}
                />
                <Bar
                  dataKey="turnover"
                  name="turnover"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="profit"
                  name="profit"
                  fill="var(--primary)"
                  fillOpacity={0.35}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>
            {labels.laborCost} (BGN) & {labels.laborPct}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={points}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="laborGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  formatter={(value, name) => [
                    String(name) === "laborCost"
                      ? formatBgn(toFiniteNumber(value))
                      : `${toFiniteNumber(value)}%`,
                    String(name) === "laborCost"
                      ? labels.laborCost
                      : labels.laborPct,
                  ]}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid var(--border)",
                    fontSize: "0.8rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="laborCost"
                  name="laborCost"
                  stroke="var(--primary)"
                  fill="url(#laborGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

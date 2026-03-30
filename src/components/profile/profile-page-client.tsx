"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { endOfMonth, format, startOfMonth } from "date-fns";
import {
  Building2,
  Check,
  Copy,
  CreditCard,
  Download,
  Filter,
  LogOut,
  Mail,
  Save,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import {
  type ProfileSettingsActionState,
  updateRestaurantSettingsAction,
} from "@/actions/profile";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBgnCurrencyFromEur, formatCurrency, formatMonthLabel } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";
import { calculateMonthStats } from "@/lib/profile-stats";
import type {
  DailyReportWithAttendance,
  Employee,
  Profile,
  Restaurant,
  SnapshotMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type TelegramConfigState = "connectable" | "missing_public_username" | "not_configured";
type ProfileTab = "general" | "telegram" | "staff";

type ProfilePageClientProps = {
  reports: DailyReportWithAttendance[];
  employees: Employee[];
  profile: Profile | null;
  restaurant: Restaurant | null;
  dataMode: SnapshotMode;
  telegramConnectUrl: string | null;
  telegramLinkedUsersCount: number;
  telegramConfigState: TelegramConfigState;
  employeeCount: number;
};

type Slice = { key: string; label: string; amount: number; color: string };

const initialState: ProfileSettingsActionState = {
  status: "idle",
  message: null,
  refreshKey: null,
};

const COLORS = [
  "var(--primary)",
  "var(--success)",
  "var(--warning)",
  "color-mix(in srgb, var(--primary) 55%, white)",
  "var(--muted-foreground)",
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function roleLabel(role: Employee["role"]) {
  return role === "kitchen" ? "Кухня" : "Сервиз";
}

function expenseSlices(reports: DailyReportWithAttendance[]) {
  const map = new Map<string, Slice>();
  for (const report of reports) {
    let tracked = 0;
    for (const item of report.expenseItems) {
      const label = item.categoryName?.trim() || "Без категория";
      const key = item.categoryId ?? label;
      tracked += item.amount;
      const existing = map.get(key);
      if (existing) existing.amount += item.amount;
      else map.set(key, { key, label, amount: item.amount, color: COLORS[map.size % COLORS.length] });
    }
    const remainder = Math.max(report.manualExpense - tracked, 0);
    if (remainder > 0) {
      const key = "Без категория";
      const existing = map.get(key);
      if (existing) existing.amount += remainder;
      else map.set(key, { key, label: key, amount: remainder, color: COLORS[map.size % COLORS.length] });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

function donutBackground(slices: Slice[]) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  if (total <= 0) return "conic-gradient(#e2e8f0 0deg 360deg)";
  let angle = 0;
  return `conic-gradient(${slices
    .map((slice) => {
      const sweep = (slice.amount / total) * 360;
      const segment = `${slice.color} ${angle}deg ${angle + sweep}deg`;
      angle += sweep;
      return segment;
    })
    .join(", ")})`;
}

export function ProfilePageClient({
  reports,
  employees,
  profile,
  restaurant,
  dataMode,
  telegramConnectUrl,
  telegramLinkedUsersCount,
  telegramConfigState,
  employeeCount,
}: ProfilePageClientProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<ProfileTab>("general");
  const [restaurantName, setRestaurantName] = useState(restaurant?.name ?? "");
  const [copied, setCopied] = useState(false);
  const refreshedRef = useRef<string | null>(null);
  const [state, saveAction, isSaving] = useActionState(updateRestaurantSettingsAction, initialState);

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthKey = format(monthStart, "yyyy-MM-01");
  const monthLabel = formatMonthLabel(monthKey, locale === "bg" ? "bg" : "en");
  const monthPrefix = monthKey.slice(0, 7);
  const monthReports = reports.filter((report) => report.workDate.startsWith(monthPrefix));
  const stats = calculateMonthStats(monthReports);
  const slices = expenseSlices(monthReports);
  const totalExpenses = slices.reduce((sum, slice) => sum + slice.amount, 0);
  const budgetBase =
    stats.totalTurnover > 0
      ? stats.totalTurnover
      : (restaurant?.defaultDailyExpense ?? 0) * Math.max(stats.recordedDays, 1);
  const heroPct = budgetBase > 0 ? Math.min((stats.totalExpense / budgetBase) * 100, 100) : 0;
  const laborPct =
    stats.totalExpense + stats.totalLaborCost > 0
      ? Math.min((stats.totalLaborCost / (stats.totalExpense + stats.totalLaborCost)) * 100, 100)
      : 0;

  useEffect(() => {
    if (state.status === "success" && state.refreshKey && refreshedRef.current !== state.refreshKey) {
      refreshedRef.current = state.refreshKey;
      router.refresh();
    }
  }, [router, state]);

  async function copyLink() {
    if (!telegramConnectUrl || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(telegramConnectUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function openTelegram() {
    if (typeof window === "undefined" || !telegramConnectUrl) return;
    const popup = window.open(telegramConnectUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.assign(telegramConnectUrl);
    }
  }

  const inviteValue =
    telegramConnectUrl ??
    (telegramConfigState === "missing_public_username"
      ? "Добавете NEXT_PUBLIC_TELEGRAM_BOT_USERNAME в .env.local"
      : "Telegram не е конфигуриран за този профил");
  const telegramBadge =
    telegramConfigState === "connectable"
      ? "Активно"
      : telegramConfigState === "missing_public_username"
        ? "Липсва username"
        : "Не е готово";
  const telegramCopy =
    telegramConfigState === "connectable"
      ? `${telegramLinkedUsersCount} свързан(и) Telegram акаунт(а)`
      : telegramConfigState === "missing_public_username"
        ? "Backend-ът е готов, но web бутонът няма публичен bot username."
        : "Провери Telegram env настройките за този deployment.";
  const feedback =
    state.message ?? (dataMode === "demo" ? "Промените са изключени в demo режим." : null);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl dark:text-white">
                  Настройки
                </h1>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                  {dataMode === "demo" ? "Demo Mode" : "Live Operations"}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500">
                Управление на бизнеса, разходите и Telegram копилота
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                form="business-settings-form"
                disabled={isSaving || dataMode === "demo" || !restaurantName.trim()}
                className="rounded-xl bg-slate-900 px-6 font-bold text-white hover:bg-slate-800"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Запазване..." : "Save"}
              </Button>
              <form action={logoutAction}>
                <Button
                  type="submit"
                  variant="outline"
                  className="rounded-xl border-red-100 bg-white text-red-600 shadow-sm hover:border-red-200 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Изход
                </Button>
              </form>
            </div>
          </div>

          <div className="flex w-fit items-center gap-2 overflow-x-auto rounded-xl border border-slate-200/60 bg-slate-200/50 p-1 dark:border-slate-800 dark:bg-slate-900">
            {[
              { id: "general" as const, label: "Общи данни", icon: Settings, active: "text-emerald-700" },
              { id: "telegram" as const, label: "Telegram", icon: Smartphone, active: "text-blue-700" },
              { id: "staff" as const, label: "Персонал", icon: Users, active: "text-amber-700" },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-6 py-2.5 text-sm font-bold transition-all",
                    active
                      ? `bg-white shadow-sm border border-slate-200/50 ${tab.active}`
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "general" ? (
          <div className="space-y-8">
            <section className="relative overflow-hidden rounded-xl border border-slate-200/60 bg-white p-8 shadow-[0_40px_40px_0_rgba(16,185,129,0.08)]">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Monthly Expenditure
                  </p>
                  <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
                    {formatCurrency(stats.totalExpense)}
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {formatBgnCurrencyFromEur(stats.totalExpense)} · {monthLabel}
                  </p>
                </div>
                <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Live Operations
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-2 text-xs font-medium text-slate-500 sm:flex-row sm:items-end sm:justify-between">
                  <p>
                    {stats.totalTurnover > 0
                      ? "Разходи спрямо месечния оборот"
                      : "Разходи спрямо дневната базова стойност"}
                  </p>
                  <p className="font-bold text-slate-900">
                    {stats.totalTurnover > 0
                      ? `${formatCurrency(stats.totalTurnover)} оборот`
                      : `${formatCurrency(budgetBase)} базов лимит`}
                  </p>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-400"
                    style={{ width: `${heroPct}%` }}
                  />
                </div>
              </div>
              <div className="pointer-events-none absolute -bottom-10 -right-6 text-[180px] font-black text-slate-100">
                A
              </div>
            </section>

            <section className="grid grid-cols-12 gap-6">
              <div className="col-span-12 rounded-xl border border-slate-200/60 bg-white p-8 shadow-sm lg:col-span-8">
                <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Expense Distribution</h3>
                  <span className="text-xs font-medium text-slate-500">
                    {format(monthStart, "MMM dd")} - {format(monthEnd, "MMM dd, yyyy")}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-10 md:flex-row">
                  <div
                    className="relative flex h-56 w-56 items-center justify-center rounded-full"
                    style={{ background: donutBackground(slices) }}
                  >
                    <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {formatCurrency(totalExpenses)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        Total
                      </span>
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                    {slices.length > 0 ? (
                      slices.map((slice) => {
                        const pct = totalExpenses > 0 ? Math.round((slice.amount / totalExpenses) * 100) : 0;
                        return (
                          <div key={slice.key} className="flex items-center gap-3">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                            <div className="flex flex-1 justify-between border-b border-slate-100 pb-1 text-xs">
                              <span className="font-semibold text-slate-900">{slice.label}</span>
                              <span className="font-bold text-emerald-700">{pct}%</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-slate-500">Все още няма разходи за избрания месец.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-12 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-700 p-8 text-white shadow-sm lg:col-span-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] opacity-80">
                  Labor Cost Allocation
                </p>
                <h3 className="text-3xl font-extrabold tracking-tight">{formatCurrency(stats.totalLaborCost)}</h3>
                <p className="mt-2 text-sm text-white/75">{employeeCount} активни служители · {monthLabel}</p>
                <div className="mt-14 space-y-4">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-[0.14em]">
                    <span>Дял от общите разходи</span>
                    <span>{laborPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-white" style={{ width: `${laborPct}%` }} />
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
              <div>
                <h3 className="text-base font-bold text-slate-900">Профил на бизнеса</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Името се показва във вашите отчети и фактури. Имейлът се използва за вход в системата.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <form id="business-settings-form" action={saveAction} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Име на обект</Label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        name="restaurantName"
                        value={restaurantName}
                        onChange={(event) => setRestaurantName(event.target.value)}
                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 pl-11 font-medium focus-visible:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Администратор (Email)</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={profile?.email ?? ""}
                        disabled
                        className="h-12 rounded-xl border-slate-200 bg-slate-100/50 pl-11 font-medium text-slate-500"
                      />
                    </div>
                  </div>
                  {feedback ? (
                    <div
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm font-medium",
                        state.status === "success"
                          ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                          : state.status === "error"
                            ? "border border-red-100 bg-red-50 text-red-700"
                            : "border border-slate-200 bg-slate-50 text-slate-500",
                      )}
                    >
                      {feedback}
                    </div>
                  ) : null}
                </form>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "telegram" ? (
          <div className="space-y-12">
            <section className="grid grid-cols-1 gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
              <div>
                <h3 className="text-base font-bold text-slate-900">Telegram Копилот</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Свържете персоналния бот за бързи разходи, снимки на бележки и справки по всяко време.
                </p>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 border-t-4 border-t-blue-500 bg-white p-8 shadow-sm">
                <div className="absolute right-6 top-6">
                  <span className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                    {telegramBadge}
                  </span>
                </div>
                <div className="space-y-6 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Персонален линк</Label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <Input readOnly value={inviteValue} className="h-12 rounded-xl border-slate-200 bg-slate-50/50 pr-12 font-medium text-slate-700" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={copyLink}
                          disabled={!telegramConnectUrl}
                          className="absolute right-1 top-1 h-10 w-10 rounded-xl text-slate-500 hover:bg-slate-100"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        type="button"
                        onClick={openTelegram}
                        disabled={!telegramConnectUrl}
                        className="h-12 rounded-xl bg-blue-600 px-8 font-bold text-white hover:bg-blue-700"
                      >
                        <Smartphone className="h-4 w-4" />
                        Отвори в Telegram
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">{telegramCopy}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Бутонът отваря публичния t.me линк към бота и запазва еднократния start token.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-slate-200/60" />

            <section className="grid grid-cols-1 gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
              <div>
                <h3 className="text-base font-bold text-slate-900">Достъп за управители</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Поддържай контролиран достъп и виж текущия статус на свързаните Telegram акаунти.
                </p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed border-slate-200/60 bg-slate-50 p-8 text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Защитена връзка</h4>
                <p className="max-w-sm text-sm text-slate-500">
                  В момента има {telegramLinkedUsersCount} свързан(и) акаунт(а). Следващата стъпка е покани с еднократен код за управители.
                </p>
                <Button variant="outline" className="rounded-xl border-slate-300 bg-white font-bold">
                  Скоро: код за покана
                </Button>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "staff" ? (
          <div className="space-y-8">
            <section className="overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50 shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200/50 bg-white px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-xl font-bold text-slate-900">Personnel Ledger</h3>
                <div className="flex gap-3">
                  <Button variant="outline" className="rounded-lg border-slate-200 bg-white text-xs font-bold">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                  <Button asChild variant="outline" className="rounded-lg border-slate-200 bg-white text-xs font-bold">
                    <Link href="/employees">
                      <Download className="h-4 w-4" />
                      Open Employees
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
                      <th className="px-8 py-4">Employee Details</th>
                      <th className="px-8 py-4 text-center">Role</th>
                      <th className="px-8 py-4 text-center">Daily Rate</th>
                      <th className="px-8 py-4 text-center">Phone</th>
                      <th className="px-8 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 bg-white">
                    {employees.length > 0 ? (
                      employees.map((employee, index) => (
                        <tr key={employee.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
                                  index % 2 === 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700",
                                )}
                              >
                                {initials(employee.fullName)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{employee.fullName}</p>
                                <p className="text-[10px] text-slate-500">{employee.phoneNumber ?? "No phone provided"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center text-sm text-slate-700">{roleLabel(employee.role)}</td>
                          <td className="px-8 py-5 text-center text-sm font-semibold text-slate-900">{formatCurrency(employee.dailyRate)}</td>
                          <td className="px-8 py-5 text-center text-sm text-slate-500">{employee.phoneNumber ?? "—"}</td>
                          <td className="px-8 py-5 text-right">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                                employee.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full", employee.isActive ? "bg-emerald-500" : "bg-slate-400")} />
                              {employee.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-10 text-center text-sm text-slate-500">
                          Все още няма служители.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
              <div>
                <h3 className="text-base font-bold text-slate-900">Оперативен преглед</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Кратка снимка на разходите и активния екип за текущия месец.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Персонал</span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900">
                    {employeeCount} <span className="text-sm font-medium text-slate-500">активни</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Разходи ({monthLabel})</span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900">{formatCurrency(stats.totalExpense)}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{formatBgnCurrencyFromEur(stats.totalExpense)}</p>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

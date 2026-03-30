"use client";

import { type ReactNode, useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, startOfMonth } from "date-fns";
import {
  Bot,
  Building2,
  Check,
  Copy,
  CreditCard,
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
import {
  formatBgnCurrencyFromEur,
  formatCurrency,
  formatMonthLabel,
} from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";
import type { DailyReportWithAttendance, Profile, Restaurant, SnapshotMode } from "@/lib/types";
import { cn } from "@/lib/utils";

type TelegramConfigState = "connectable" | "missing_public_username" | "not_configured";
type ProfileTab = "general" | "telegram" | "staff";

type ProfilePageClientProps = {
  reports: DailyReportWithAttendance[];
  profile: Profile | null;
  restaurant: Restaurant | null;
  dataMode: SnapshotMode;
  telegramConnectUrl: string | null;
  telegramLinkedUsersCount: number;
  telegramConfigState: TelegramConfigState;
  employeeCount: number;
};

type SectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

const initialSettingsState: ProfileSettingsActionState = {
  status: "idle",
  message: null,
  refreshKey: null,
};

function buildTelegramAppUrl(connectUrl: string) {
  try {
    const parsedUrl = new URL(connectUrl);
    const username = parsedUrl.pathname.replace(/^\/+/, "");

    if (!username) {
      return null;
    }

    const appUrl = new URL("tg://resolve");
    appUrl.searchParams.set("domain", username);

    const startToken = parsedUrl.searchParams.get("start");
    if (startToken) {
      appUrl.searchParams.set("start", startToken);
    }

    return appUrl.toString();
  } catch {
    return null;
  }
}

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_2fr]">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  toneClassName,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  toneClassName: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            toneClassName,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <div>
        <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white">{value}</h4>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
    </div>
  );
}

export function ProfilePageClient({
  reports,
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
  const refreshedKeyRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("general");
  const [restaurantName, setRestaurantName] = useState(restaurant?.name ?? "");
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [settingsState, saveSettingsAction, isSaving] = useActionState(
    updateRestaurantSettingsAction,
    initialSettingsState,
  );

  const currentMonthKey = format(startOfMonth(new Date()), "yyyy-MM-01");
  const currentMonthLabel = formatMonthLabel(currentMonthKey, locale);

  const monthlyExpenses = useMemo(
    () =>
      reports
        .filter((report) => report.workDate.startsWith(currentMonthKey.slice(0, 7)))
        .reduce((sum, report) => sum + report.manualExpense, 0),
    [currentMonthKey, reports],
  );

  useEffect(() => {
    if (
      settingsState.status === "success" &&
      settingsState.refreshKey &&
      refreshedKeyRef.current !== settingsState.refreshKey
    ) {
      refreshedKeyRef.current = settingsState.refreshKey;
      router.refresh();
    }
  }, [router, settingsState]);

  useEffect(() => {
    setRestaurantName(restaurant?.name ?? "");
  }, [restaurant?.name]);

  const settingsMessage =
    settingsState.message ??
    (dataMode === "demo" ? "Промените са изключени в demo режим." : null);

  const telegramLinkValue =
    telegramConnectUrl ??
    (telegramConfigState === "missing_public_username"
      ? "Добавете NEXT_PUBLIC_TELEGRAM_BOT_USERNAME в .env.local"
      : "Telegram не е конфигуриран за този профил");

  const telegramStatusLabel =
    telegramConfigState === "connectable"
      ? "Активно"
      : telegramConfigState === "missing_public_username"
        ? "Липсва username"
        : "Не е готово";

  const telegramStatusCopy =
    telegramConfigState === "connectable"
      ? `${telegramLinkedUsersCount} свързан(и) Telegram акаунт(а)`
      : telegramConfigState === "missing_public_username"
        ? "Backend-ът е готов, но web бутонът няма публичен bot username."
        : "Провери Telegram env настройките за този deployment.";

  async function copyInviteLink() {
    if (!telegramConnectUrl || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(telegramConnectUrl);
    setCopiedInviteLink(true);
    window.setTimeout(() => setCopiedInviteLink(false), 1600);
  }

  function openTelegramConnect() {
    if (typeof window === "undefined" || !telegramConnectUrl) {
      return;
    }

    const appUrl = buildTelegramAppUrl(telegramConnectUrl);
    if (!appUrl) {
      window.open(telegramConnectUrl, "_blank", "noopener,noreferrer");
      return;
    }

    let finished = false;
    const cleanup = () => {
      if (finished) {
        return;
      }

      finished = true;
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };

    const handleBlur = () => cleanup();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        cleanup();
      }
    };

    const fallbackTimer = window.setTimeout(() => {
      cleanup();
      window.open(telegramConnectUrl, "_blank", "noopener,noreferrer");
    }, 900);

    window.addEventListener("blur", handleBlur, { once: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.location.href = appUrl;
  }

  const tabs = [
    {
      id: "general" as const,
      label: "Общи данни",
      icon: Settings,
      activeClass:
        "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-200/50",
    },
    {
      id: "telegram" as const,
      label: "Telegram",
      icon: Smartphone,
      activeClass:
        "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-sm border border-slate-200/50",
    },
    {
      id: "staff" as const,
      label: "Персонал",
      icon: Users,
      activeClass:
        "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-sm border border-slate-200/50",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 animate-in fade-in duration-500 md:p-12 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl dark:text-white">
                Настройки
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Управление на бизнеса и интеграциите
              </p>
            </div>

            <div className="flex items-center gap-3">
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
                  className="rounded-xl border-red-100 bg-white text-red-600 shadow-sm transition-all hover:border-red-200 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Изход
                </Button>
              </form>
            </div>
          </div>

          <div className="flex w-fit items-center gap-2 overflow-x-auto rounded-xl border border-slate-200/60 bg-slate-200/50 p-1 dark:border-slate-800 dark:bg-slate-900">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-6 py-2.5 text-sm font-bold transition-all",
                    isActive
                      ? tab.activeClass
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-12 pb-24">
          {activeTab === "general" ? (
            <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
              <Section
                title="Профил на бизнеса"
                description="Това име се показва във вашите отчети и фактури. Имейлът се използва за вход в системата."
              >
                <div className="space-y-6 rounded-2xl border border-slate-200/60 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <form id="business-settings-form" action={saveSettingsAction} className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Име на обект
                      </Label>
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
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Администратор (Email)
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={profile?.email ?? ""}
                          disabled
                          className="h-12 rounded-xl border-slate-200 bg-slate-100/50 pl-11 font-medium text-slate-500"
                        />
                      </div>
                    </div>

                    {settingsMessage ? (
                      <div
                        className={cn(
                          "rounded-xl px-4 py-3 text-sm font-medium",
                          settingsState.status === "success"
                            ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                            : settingsState.status === "error"
                              ? "border border-red-100 bg-red-50 text-red-700"
                              : "border border-slate-200 bg-slate-50 text-slate-500",
                        )}
                      >
                        {settingsMessage}
                      </div>
                    ) : null}
                  </form>
                </div>
              </Section>

              <hr className="border-slate-200/60 dark:border-slate-800" />

              <Section
                title="Текущо състояние"
                description="Бърз преглед на основните показатели на вашия обект за текущия месец."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <StatCard
                    icon={Users}
                    toneClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                    label="Персонал"
                    value={`${employeeCount}`}
                    hint="активни служители"
                  />
                  <StatCard
                    icon={CreditCard}
                    toneClassName="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    label={`Разходи (${currentMonthLabel})`}
                    value={formatCurrency(monthlyExpenses)}
                    hint={formatBgnCurrencyFromEur(monthlyExpenses)}
                  />
                </div>
              </Section>
            </div>
          ) : null}

          {activeTab === "telegram" ? (
            <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
              <Section
                title="Telegram Копилот"
                description="Свържете персоналния си бот, за да въвеждате разходи и да правите бързи справки."
              >
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 border-t-4 border-t-blue-500 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="absolute right-6 top-6">
                    <span className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                      {telegramStatusLabel}
                    </span>
                  </div>

                  <div className="space-y-6 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Персонален линк
                      </Label>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                          <Input
                            readOnly
                            value={telegramLinkValue}
                            className="h-12 rounded-xl border-slate-200 bg-slate-50/50 pr-12 font-medium text-slate-700"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={copyInviteLink}
                            disabled={!telegramConnectUrl}
                            className="absolute right-1 top-1 h-10 w-10 rounded-xl text-slate-500 hover:bg-slate-100"
                          >
                            {copiedInviteLink ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          onClick={openTelegramConnect}
                          disabled={!telegramConnectUrl}
                          className="h-12 rounded-xl bg-blue-600 px-8 font-bold text-white hover:bg-blue-700"
                        >
                          <Smartphone className="h-4 w-4" />
                          Отвори в Telegram
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-900">{telegramStatusCopy}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Бутонът опитва да отвори Telegram app първо и пада обратно към web само при нужда.
                      </p>
                    </div>
                  </div>
                </div>
              </Section>

              <hr className="border-slate-200/60 dark:border-slate-800" />

              <Section
                title="Достъп за управители"
                description="Поддържай контролиран достъп и виж текущия статус на свързаните Telegram акаунти."
              >
                <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed border-slate-200/60 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Защитена връзка
                  </h4>
                  <p className="max-w-sm text-sm text-slate-500">
                    В момента има {telegramLinkedUsersCount} свързан(и) акаунт(а). Следващата стъпка е покани с еднократен код за управители.
                  </p>
                  <Button variant="outline" className="rounded-xl border-slate-300 bg-white font-bold">
                    Скоро: код за покана
                  </Button>
                </div>
              </Section>
            </div>
          ) : null}

          {activeTab === "staff" ? (
            <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
              <Section
                title="Персонал и операции"
                description="Бързи индикатори за екипа и навигация към детайлните работни екрани."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <StatCard
                    icon={Users}
                    toneClassName="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                    label="Екип"
                    value={`${employeeCount}`}
                    hint="общо активни профили"
                  />
                  <StatCard
                    icon={CreditCard}
                    toneClassName="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    label="Оперативни разходи"
                    value={formatCurrency(monthlyExpenses)}
                    hint={currentMonthLabel}
                  />
                </div>
              </Section>

              <hr className="border-slate-200/60 dark:border-slate-800" />

              <Section
                title="Бързи действия"
                description="Отвори директно работните екрани за екип и разплащания."
              >
                <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild className="h-11 rounded-xl bg-slate-900 px-6 font-bold text-white hover:bg-slate-800">
                      <Link href="/employees">Към служители</Link>
                    </Button>
                    <Button asChild variant="outline" className="h-11 rounded-xl border-slate-300 bg-white font-bold">
                      <Link href="/payroll">Към заплати</Link>
                    </Button>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Този таб е подготвен като персонален control room. Ако искаш, следващата стъпка е да добавя и compact roster table тук, по подобие на стила от снимката.
                  </div>
                </div>
              </Section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

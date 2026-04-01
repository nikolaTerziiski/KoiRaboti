"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  Copy,
  LogOut,
  Mail,
  Save,
  Smartphone,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import {
  type ProfileSettingsActionState,
  updateRestaurantSettingsAction,
} from "@/actions/profile";
import { PayrollCadenceFields } from "@/components/payroll/payroll-cadence-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/context";
import { buildRestaurantPayrollDraft } from "@/lib/payroll-settings";
import type { Profile, Restaurant, SnapshotMode } from "@/lib/types";
import { cn } from "@/lib/utils";

type TelegramConfigState = "connectable" | "missing_public_username" | "not_configured";

type ProfilePageClientProps = {
  profile: Profile | null;
  restaurant: Restaurant | null;
  dataMode: SnapshotMode;
  telegramConnectUrl: string | null;
  telegramConfigState: TelegramConfigState;
};

const initialState: ProfileSettingsActionState = {
  status: "idle",
  message: null,
  refreshKey: null,
};

export function ProfilePageClient({
  profile,
  restaurant,
  dataMode,
  telegramConnectUrl,
  telegramConfigState,
}: ProfilePageClientProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const refreshedRef = useRef<string | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const [restaurantName, setRestaurantName] = useState(restaurant?.name ?? "");
  const [payrollDraft, setPayrollDraft] = useState(() =>
    buildRestaurantPayrollDraft(restaurant),
  );
  const [copied, setCopied] = useState(false);
  const [state, saveAction, isSaving] = useActionState(
    updateRestaurantSettingsAction,
    initialState,
  );

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      state.status === "success" &&
      state.refreshKey &&
      refreshedRef.current !== state.refreshKey
    ) {
      refreshedRef.current = state.refreshKey;
      router.refresh();
    }
  }, [router, state]);

  const copy =
    locale === "bg"
      ? {
          title: "Настройки",
          logout: "Изход",
          businessTitle: "Общи данни",
          businessDescription: "Управлявайте основните данни за обекта.",
          payrollTitle: "Payroll по подразбиране",
          payrollDescription:
            "Това е общият график за заплащане, който новите служители наследяват по подразбиране.",
          restaurantName: "Име на обект",
          adminEmail: "Администратор",
          save: "Запази промените",
          saving: "Запазване...",
          saveSuccess: "Промените са запазени успешно.",
          saveError: "Промените не можаха да бъдат запазени.",
          demoNote: "Промените са изключени в demo режим.",
          telegramTitle: "Telegram Копилот",
          telegramDescription:
            "Свържете персоналния си бот за бързо въвеждане на разходи.",
          telegramLink: "Персонален линк",
          openTelegram: "Отвори в Telegram",
          copyLink: "Копирай линка",
          copied: "Копирано",
          active: "Активно",
          needsUsername: "Липсва username",
          inactive: "Неактивно",
          missingPublicUsername:
            "Добавете NEXT_PUBLIC_TELEGRAM_BOT_USERNAME в .env.local",
          notConfigured: "Telegram не е конфигуриран за този профил.",
        }
      : {
          title: "Settings",
          logout: "Sign out",
          businessTitle: "General details",
          businessDescription: "Manage the core business information.",
          payrollTitle: "Default payroll schedule",
          payrollDescription:
            "This is the shared payroll rhythm that new employees inherit by default.",
          restaurantName: "Business name",
          adminEmail: "Administrator",
          save: "Save changes",
          saving: "Saving...",
          saveSuccess: "Changes were saved successfully.",
          saveError: "Changes could not be saved.",
          demoNote: "Changes are disabled in demo mode.",
          telegramTitle: "Telegram Copilot",
          telegramDescription:
            "Connect your personal bot for quick expense capture.",
          telegramLink: "Personal link",
          openTelegram: "Open in Telegram",
          copyLink: "Copy link",
          copied: "Copied",
          active: "Active",
          needsUsername: "Missing username",
          inactive: "Inactive",
          missingPublicUsername:
            "Add NEXT_PUBLIC_TELEGRAM_BOT_USERNAME to .env.local",
          notConfigured: "Telegram is not configured for this profile.",
        };

  const feedback =
    state.status === "success"
      ? copy.saveSuccess
      : state.status === "error"
        ? copy.saveError
        : dataMode === "demo"
          ? copy.demoNote
          : null;
  const feedbackClassName =
    state.status === "success"
      ? "border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
      : state.status === "error"
        ? "border border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
        : "border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400";

  const telegramValue =
    telegramConnectUrl ??
    (telegramConfigState === "missing_public_username"
      ? copy.missingPublicUsername
      : copy.notConfigured);

  const telegramStatus =
    telegramConfigState === "connectable"
      ? {
          label: copy.active,
          className:
            "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
          dotClassName: "bg-emerald-500",
          pulse: true,
        }
      : telegramConfigState === "missing_public_username"
        ? {
            label: copy.needsUsername,
            className:
              "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            dotClassName: "bg-amber-500",
            pulse: false,
          }
        : {
            label: copy.inactive,
            className:
              "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
            dotClassName: "bg-slate-400",
            pulse: false,
          };

  async function copyLink() {
    if (!telegramConnectUrl || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(telegramConnectUrl);
    setCopied(true);

    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
    }

    copyTimeoutRef.current = window.setTimeout(() => {
      setCopied(false);
      copyTimeoutRef.current = null;
    }, 1500);
  }

  function openTelegram() {
    if (typeof window === "undefined" || !telegramConnectUrl) {
      return;
    }

    const popup = window.open(telegramConnectUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.assign(telegramConnectUrl);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {copy.title}
          </h1>

          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              className="h-11 rounded-xl border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogOut className="size-4" />
              {copy.logout}
            </Button>
          </form>
        </header>

        <section className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {copy.businessTitle}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {copy.businessDescription}
            </p>
          </div>

          <form action={saveAction} className="mt-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="profile-restaurant-name">{copy.restaurantName}</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="profile-restaurant-name"
                  name="restaurantName"
                  value={restaurantName}
                  onChange={(event) => setRestaurantName(event.target.value)}
                  className="h-12 rounded-2xl border-slate-200/70 bg-slate-50 pl-11 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-admin-email">{copy.adminEmail}</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="profile-admin-email"
                  value={profile?.email ?? ""}
                  disabled
                  readOnly
                  className="h-12 rounded-2xl border-slate-200/70 bg-slate-100 pl-11 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                />
              </div>
            </div>

            <PayrollCadenceFields
              idPrefix="profile-restaurant-default-payroll"
              title={copy.payrollTitle}
              description={copy.payrollDescription}
              value={payrollDraft}
              onChange={(field, nextValue) =>
                setPayrollDraft((current) => ({
                  ...current,
                  [field]: nextValue,
                }))
              }
              fieldNames={{
                cadence: "defaultPayrollCadence",
                weeklyPayday: "defaultWeeklyPayday",
                monthlyPayDay: "defaultMonthlyPayDay",
                twiceMonthlyDay1: "defaultTwiceMonthlyDay1",
                twiceMonthlyDay2: "defaultTwiceMonthlyDay2",
              }}
            />

            {feedback ? (
              <div className={cn("rounded-2xl px-4 py-3 text-sm font-medium", feedbackClassName)}>
                {feedback}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isSaving || dataMode === "demo" || !restaurantName.trim()}
              className="h-12 rounded-2xl bg-emerald-600 px-5 text-white hover:bg-emerald-700"
            >
              <Save className="size-4" />
              {isSaving ? copy.saving : copy.save}
            </Button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {copy.telegramTitle}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {copy.telegramDescription}
              </p>
            </div>

            <span
              className={cn(
                "inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-semibold",
                telegramStatus.className,
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  telegramStatus.dotClassName,
                  telegramStatus.pulse && "animate-pulse",
                )}
              />
              {telegramStatus.label}
            </span>
          </div>

          <div className="mt-8 space-y-2">
            <Label htmlFor="telegram-connect-link">{copy.telegramLink}</Label>
            <div className="relative">
              <Input
                id="telegram-connect-link"
                value={telegramValue}
                readOnly
                className="h-12 rounded-2xl border-slate-200/70 bg-slate-50 pr-12 font-mono text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 md:text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={copyLink}
                disabled={!telegramConnectUrl}
                aria-label={copied ? copy.copied : copy.copyLink}
                className="absolute right-1 top-1 size-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <Button
              type="button"
              onClick={openTelegram}
              disabled={!telegramConnectUrl}
              className="h-12 rounded-xl bg-[#0088cc] px-5 text-white hover:bg-[#0077b5] disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
            >
              <Smartphone className="size-4" />
              {copy.openTelegram}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

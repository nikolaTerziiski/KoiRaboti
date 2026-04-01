"use client";

import { format, setISODay, startOfWeek } from "date-fns";
import { bg, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/context";
import type { EmployeePaymentSchedule } from "@/lib/types";
import { cn } from "@/lib/utils";

export type EmployeePaymentScheduleDraft = {
  paymentSchedule: EmployeePaymentSchedule;
  paymentDay1: string;
  paymentDay2: string;
  paymentWeekday: number;
};

type EmployeePaymentScheduleFieldsProps = {
  idPrefix: string;
  value: EmployeePaymentScheduleDraft;
  onChange: <K extends keyof EmployeePaymentScheduleDraft>(
    field: K,
    nextValue: EmployeePaymentScheduleDraft[K],
  ) => void;
  fieldNames: {
    paymentSchedule: string;
    paymentDay1: string;
    paymentDay2: string;
    paymentWeekday: string;
  };
};

function getDateLocale(locale: "bg" | "en") {
  return locale === "bg" ? bg : enUS;
}

function getWeekdayShortLabel(day: number, locale: "bg" | "en") {
  const monday = startOfWeek(new Date("2026-01-05T12:00:00.000Z"), {
    weekStartsOn: 1,
  });

  return format(setISODay(monday, day), locale === "bg" ? "EEE" : "EEE", {
    locale: getDateLocale(locale),
  });
}

export function EmployeePaymentScheduleFields({
  idPrefix,
  value,
  onChange,
  fieldNames,
}: EmployeePaymentScheduleFieldsProps) {
  const { t, locale } = useLocale();
  const scheduleOptions: EmployeePaymentSchedule[] = [
    "twice_monthly",
    "weekly",
    "monthly",
    "on_demand",
  ];

  return (
    <div className="space-y-4">
      <input
        type="hidden"
        name={fieldNames.paymentSchedule}
        value={value.paymentSchedule}
      />
      <input
        type="hidden"
        name={fieldNames.paymentWeekday}
        value={value.paymentWeekday}
      />

      <div className="space-y-2">
        <Label>{t.employees.paymentSchedule}</Label>
        <div className="grid grid-cols-2 gap-2">
          {scheduleOptions.map((schedule) => (
            <Button
              key={schedule}
              type="button"
              variant={value.paymentSchedule === schedule ? "default" : "outline"}
              aria-pressed={value.paymentSchedule === schedule}
              onClick={() => onChange("paymentSchedule", schedule)}
              className={cn(
                "h-11 rounded-2xl text-sm",
                value.paymentSchedule === schedule
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border-slate-200/70 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              )}
            >
              {schedule === "twice_monthly"
                ? t.employees.twiceMonthly
                : schedule === "weekly"
                  ? t.employees.weekly
                  : schedule === "monthly"
                    ? t.employees.monthly
                    : t.employees.onDemand}
            </Button>
          ))}
        </div>
      </div>

      {value.paymentSchedule === "twice_monthly" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-payment-day-1`}>{t.employees.payDay1}</Label>
            <Input
              id={`${idPrefix}-payment-day-1`}
              name={fieldNames.paymentDay1}
              type="number"
              inputMode="numeric"
              min="1"
              max="28"
              value={value.paymentDay1}
              onChange={(event) => onChange("paymentDay1", event.target.value)}
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-payment-day-2`}>{t.employees.payDay2}</Label>
            <Input
              id={`${idPrefix}-payment-day-2`}
              name={fieldNames.paymentDay2}
              type="number"
              inputMode="numeric"
              min="1"
              max="28"
              value={value.paymentDay2}
              onChange={(event) => onChange("paymentDay2", event.target.value)}
              className="h-11 rounded-2xl"
            />
          </div>
        </div>
      ) : null}

      {value.paymentSchedule === "monthly" ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-payment-day-1`}>{t.employees.payDay1}</Label>
          <Input
            id={`${idPrefix}-payment-day-1`}
            name={fieldNames.paymentDay1}
            type="number"
            inputMode="numeric"
            min="1"
            max="28"
            value={value.paymentDay1}
            onChange={(event) => onChange("paymentDay1", event.target.value)}
            className="h-11 rounded-2xl"
          />
        </div>
      ) : null}

      {value.paymentSchedule === "weekly" ? (
        <div className="space-y-2">
          <Label>{t.employees.weekday}</Label>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {Array.from({ length: 7 }, (_, index) => index + 1).map((day) => (
              <Button
                key={day}
                type="button"
                variant={value.paymentWeekday === day ? "default" : "outline"}
                aria-pressed={value.paymentWeekday === day}
                onClick={() => onChange("paymentWeekday", day)}
                className={cn(
                  "h-11 rounded-2xl px-2 text-sm",
                  value.paymentWeekday === day
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border-slate-200/70 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                )}
              >
                {getWeekdayShortLabel(day, locale)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

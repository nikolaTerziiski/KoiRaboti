"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { useLocale } from "@/lib/i18n/context";
import type { PayrollCadence } from "@/lib/types";

export type PayrollCadenceDraft = {
  cadence: PayrollCadence;
  weeklyPayday: string;
  monthlyPayDay: string;
  twiceMonthlyDay1: string;
  twiceMonthlyDay2: string;
};

type PayrollCadenceFieldsProps = {
  idPrefix: string;
  title?: string;
  description?: string;
  value: PayrollCadenceDraft;
  onChange: <K extends keyof PayrollCadenceDraft>(
    field: K,
    nextValue: PayrollCadenceDraft[K],
  ) => void;
  fieldNames: {
    cadence: string;
    weeklyPayday: string;
    monthlyPayDay: string;
    twiceMonthlyDay1: string;
    twiceMonthlyDay2: string;
  };
};

export function PayrollCadenceFields({
  idPrefix,
  title,
  description,
  value,
  onChange,
  fieldNames,
}: PayrollCadenceFieldsProps) {
  const { locale } = useLocale();
  const copy =
    locale === "bg"
      ? {
          cadence: "График на плащане",
          cadenceHint: "Това определя кога служителят излиза като дължим в payroll.",
          daily: "Всеки ден",
          weekly: "Веднъж седмично",
          twiceMonthly: "Два пъти месечно",
          monthly: "Веднъж месечно",
          weeklyPayday: "Ден за седмично плащане",
          monthlyPayDay: "Ден от месеца",
          twiceMonthlyDay1: "Първи ден",
          twiceMonthlyDay2: "Втори ден",
          weekdayOptions: [
            { value: "1", label: "Понеделник" },
            { value: "2", label: "Вторник" },
            { value: "3", label: "Сряда" },
            { value: "4", label: "Четвъртък" },
            { value: "5", label: "Петък" },
            { value: "6", label: "Събота" },
            { value: "7", label: "Неделя" },
          ],
          twiceMonthlyHint: "Двата дни трябва да са различни. Ако месецът е по-къс, последният ден се скъсява автоматично.",
        }
      : {
          cadence: "Payroll cadence",
          cadenceHint: "This controls when the employee shows up as due in payroll.",
          daily: "Daily",
          weekly: "Weekly",
          twiceMonthly: "Twice monthly",
          monthly: "Monthly",
          weeklyPayday: "Weekly payday",
          monthlyPayDay: "Day of month",
          twiceMonthlyDay1: "First day",
          twiceMonthlyDay2: "Second day",
          weekdayOptions: [
            { value: "1", label: "Monday" },
            { value: "2", label: "Tuesday" },
            { value: "3", label: "Wednesday" },
            { value: "4", label: "Thursday" },
            { value: "5", label: "Friday" },
            { value: "6", label: "Saturday" },
            { value: "7", label: "Sunday" },
          ],
          twiceMonthlyHint:
            "The two days must be different. Shorter months automatically clamp to the last day.",
        };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
      {title ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {description ?? copy.cadenceHint}
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-cadence`}>{copy.cadence}</Label>
        <SelectField
          id={`${idPrefix}-cadence`}
          name={fieldNames.cadence}
          value={value.cadence}
          onChange={(event) => onChange("cadence", event.target.value as PayrollCadence)}
          className="h-11 rounded-2xl"
        >
          <option value="daily">{copy.daily}</option>
          <option value="weekly">{copy.weekly}</option>
          <option value="twice_monthly">{copy.twiceMonthly}</option>
          <option value="monthly">{copy.monthly}</option>
        </SelectField>
      </div>

      {value.cadence === "weekly" ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-weekly-payday`}>{copy.weeklyPayday}</Label>
          <SelectField
            id={`${idPrefix}-weekly-payday`}
            name={fieldNames.weeklyPayday}
            value={value.weeklyPayday}
            onChange={(event) => onChange("weeklyPayday", event.target.value)}
            className="h-11 rounded-2xl"
          >
            {copy.weekdayOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </div>
      ) : null}

      {value.cadence === "monthly" ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-monthly-pay-day`}>{copy.monthlyPayDay}</Label>
          <Input
            id={`${idPrefix}-monthly-pay-day`}
            name={fieldNames.monthlyPayDay}
            type="number"
            inputMode="numeric"
            min="1"
            max="31"
            value={value.monthlyPayDay}
            onChange={(event) => onChange("monthlyPayDay", event.target.value)}
            className="h-11 rounded-2xl"
          />
        </div>
      ) : null}

      {value.cadence === "twice_monthly" ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-twice-monthly-day-1`}>
                {copy.twiceMonthlyDay1}
              </Label>
              <Input
                id={`${idPrefix}-twice-monthly-day-1`}
                name={fieldNames.twiceMonthlyDay1}
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                value={value.twiceMonthlyDay1}
                onChange={(event) => onChange("twiceMonthlyDay1", event.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-twice-monthly-day-2`}>
                {copy.twiceMonthlyDay2}
              </Label>
              <Input
                id={`${idPrefix}-twice-monthly-day-2`}
                name={fieldNames.twiceMonthlyDay2}
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                value={value.twiceMonthlyDay2}
                onChange={(event) => onChange("twiceMonthlyDay2", event.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {copy.twiceMonthlyHint}
          </p>
        </div>
      ) : null}
    </div>
  );
}

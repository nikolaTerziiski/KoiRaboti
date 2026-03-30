import { format, parseISO } from "date-fns";
import { bg, enUS } from "date-fns/locale";
import type { Locale } from "@/lib/i18n/translations";

export const FIXED_BGN_PER_EUR = 1.95583;
export const DEFAULT_MANUAL_EXPENSE_EUR = 409.0335;

const eurFormatter = new Intl.NumberFormat("bg-BG", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const bgnFormatter = new Intl.NumberFormat("bg-BG", {
  style: "currency",
  currency: "BGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactEurFormatter = new Intl.NumberFormat("bg-BG", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const compactBgnFormatter = new Intl.NumberFormat("bg-BG", {
  style: "currency",
  currency: "BGN",
  notation: "compact",
  maximumFractionDigits: 1,
});

function getDateLocale(locale: Locale) {
  return locale === "bg" ? bg : enUS;
}

export function eurToBgn(value: number) {
  return value * FIXED_BGN_PER_EUR;
}

export function bgnToEur(value: number) {
  return value / FIXED_BGN_PER_EUR;
}

export function formatCurrency(value: number) {
  return eurFormatter.format(value);
}

export function formatCompactCurrency(value: number) {
  return compactEurFormatter.format(value);
}

export function formatBgnCurrencyFromEur(value: number) {
  return bgnFormatter.format(eurToBgn(value));
}

export function formatCurrencyPair(value: number) {
  return `${formatCurrency(value)} / ${formatBgnCurrencyFromEur(value)}`;
}

export function formatCompactBgnCurrencyFromEur(value: number) {
  return compactBgnFormatter.format(eurToBgn(value));
}

export function formatExchangeRateLabel() {
  return `1 EUR = ${FIXED_BGN_PER_EUR} BGN`;
}

export function formatDateLabel(value: string, locale: Locale = "bg") {
  return format(parseISO(value), "EEE, d MMM", {
    locale: getDateLocale(locale),
  });
}

export function formatMonthLabel(value: string, locale: Locale = "bg") {
  return format(parseISO(value), "MMMM yyyy", {
    locale: getDateLocale(locale),
  });
}

import { format, parseISO } from "date-fns";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "BGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "BGN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDateLabel(value: string) {
  return format(parseISO(value), "EEE, d MMM");
}

export function formatMonthLabel(value: string) {
  return format(parseISO(value), "MMMM yyyy");
}

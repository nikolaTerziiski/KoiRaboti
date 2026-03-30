"use client";

import { useDeferredValue, useState } from "react";
import { Calendar, Download, MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDateLabel } from "@/lib/format";
import { useLocale } from "@/lib/i18n/context";
import {
  buildTransactionsCsvContent,
  buildTransactionsCsvFilename,
  filterTransactionRows,
  resolveTransactionRows,
  type TransactionRow,
} from "@/lib/transactions";
import type { DailyReportWithAttendance, SnapshotMode } from "@/lib/types";
import { cn } from "@/lib/utils";

type TransactionsPageClientProps = {
  reports: DailyReportWithAttendance[];
  dataMode: SnapshotMode;
};

function getCategoryBadgeClassName(categoryLabel: string) {
  const normalizedCategory = categoryLabel.toLocaleLowerCase("bg-BG");

  if (
    normalizedCategory.includes("храна") ||
    normalizedCategory.includes("напит") ||
    normalizedCategory.includes("food")
  ) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  }

  if (
    normalizedCategory.includes("комун") ||
    normalizedCategory.includes("ток") ||
    normalizedCategory.includes("вода") ||
    normalizedCategory.includes("utilities")
  ) {
    return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }

  if (
    normalizedCategory.includes("поддр") ||
    normalizedCategory.includes("ремонт") ||
    normalizedCategory.includes("maintenance")
  ) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function getTransactionMetaLabel(row: TransactionRow, locale: "en" | "bg") {
  const sourceLabel =
    row.sourceType === "telegram"
      ? "Telegram"
      : locale === "bg"
        ? "Уеб"
        : "Web";
  const receiptLabel = row.hasReceipt
    ? locale === "bg"
      ? "Касова бележка"
      : "Receipt attached"
    : null;

  return [sourceLabel, receiptLabel].filter(Boolean).join(" • ");
}

export function TransactionsPageClient({
  reports,
  dataMode,
}: TransactionsPageClientProps) {
  const { locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { rows, isMockData } = resolveTransactionRows(reports, dataMode);
  const visibleRows = filterTransactionRows(rows, {
    searchQuery: deferredSearchQuery,
    fromDate,
    toDate,
  });
  const hasActiveDateFilters = Boolean(fromDate || toDate);

  const copy =
    locale === "bg"
      ? {
          title: "Транзакции",
          subtitle: "История на всички разходи и касови бележки",
          searchPlaceholder: "Търси разход...",
          filterButton: "Филтър по дата",
          exportButton: "Експорт CSV",
          fromDate: "От дата",
          toDate: "До дата",
          reset: "Изчисти",
          sampleData: "Примерни записи",
          columns: {
            date: "Дата",
            description: "Описание",
            category: "Категория",
            amount: "Сума",
            actions: "Действия",
          },
          noResultsTitle: "Няма намерени транзакции",
          noResultsCopy:
            "Промени търсенето или филтрите по дата, за да видиш повече записи.",
        }
      : {
          title: "Transactions",
          subtitle: "History of all expenses and receipt records",
          searchPlaceholder: "Search expenses...",
          filterButton: "Filter by date",
          exportButton: "Export CSV",
          fromDate: "From date",
          toDate: "To date",
          reset: "Reset",
          sampleData: "Sample rows",
          columns: {
            date: "Date",
            description: "Description",
            category: "Category",
            amount: "Amount",
            actions: "Actions",
          },
          noResultsTitle: "No transactions found",
          noResultsCopy:
            "Adjust your search or date filters to reveal more ledger entries.",
        };

  function exportCsv() {
    if (visibleRows.length === 0 || typeof window === "undefined") {
      return;
    }

    const csvContent = buildTransactionsCsvContent(visibleRows);
    const exportLabel =
      fromDate || toDate
        ? `${fromDate || "all"}-${toDate || "all"}`
        : locale === "bg"
          ? "Транзакции"
          : "Transactions";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = buildTransactionsCsvFilename(exportLabel);
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 dark:bg-slate-950 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {copy.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {copy.subtitle}
              </p>
            </div>

            {isMockData ? (
              <span className="inline-flex items-center self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {copy.sampleData}
              </span>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200/60 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="h-12 rounded-xl border-slate-200/70 bg-slate-50 pl-11 text-slate-900 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDateFilterOpen((current) => !current)}
                  className={cn(
                    "h-12 rounded-xl border-slate-200/70 bg-white px-4 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                    isDateFilterOpen &&
                      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
                  )}
                >
                  <Calendar className="size-4" />
                  {copy.filterButton}
                </Button>

                <Button
                  type="button"
                  onClick={exportCsv}
                  disabled={visibleRows.length === 0}
                  className="h-12 rounded-xl bg-emerald-600 px-5 text-white hover:bg-emerald-700"
                >
                  <Download className="size-4" />
                  {copy.exportButton}
                </Button>
              </div>
            </div>

            {isDateFilterOpen ? (
              <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {copy.fromDate}
                  </label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    className="h-11 rounded-xl border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {copy.toDate}
                  </label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                    className="h-11 rounded-xl border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                    disabled={!hasActiveDateFilters}
                    className="h-11 rounded-xl px-4 text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                  >
                    {copy.reset}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="hidden md:block">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-50 text-left dark:bg-slate-950/60">
                <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-4">{copy.columns.date}</th>
                  <th className="px-6 py-4">{copy.columns.description}</th>
                  <th className="px-6 py-4">{copy.columns.category}</th>
                  <th className="px-6 py-4 text-right">{copy.columns.amount}</th>
                  <th className="px-6 py-4 text-right">{copy.columns.actions}</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {copy.noResultsTitle}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {copy.noResultsCopy}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : null}

                {visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-200/60 transition-colors hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-950/40"
                  >
                    <td className="px-6 py-4 align-top text-sm font-medium text-slate-600 dark:text-slate-300">
                      {formatDateLabel(row.workDate, locale)}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {row.description}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {getTransactionMetaLabel(row, locale)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                          getCategoryBadgeClassName(row.categoryLabel),
                        )}
                      >
                        {row.categoryLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(row.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <button
                        type="button"
                        aria-label={copy.columns.actions}
                        className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200/70 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {visibleRows.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {copy.noResultsTitle}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {copy.noResultsCopy}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/60 dark:divide-slate-800">
                {visibleRows.map((row) => (
                  <article key={row.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {row.description}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {getTransactionMetaLabel(row, locale)}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-bold text-slate-900 dark:text-white">
                            {formatCurrency(row.amount)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {formatDateLabel(row.workDate, locale)}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                              getCategoryBadgeClassName(row.categoryLabel),
                            )}
                          >
                            {row.categoryLabel}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label={copy.columns.actions}
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

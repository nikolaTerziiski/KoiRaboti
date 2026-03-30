"use client";

import { useDeferredValue, useState } from "react";
import {
  Calendar,
  Download,
  Eye,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type TransactionActionsProps = {
  row: TransactionRow;
  actionsLabel: string;
  viewReceiptLabel: string;
  editLabel: string;
  deleteLabel: string;
  onViewReceipt?: () => void;
};

const MOCK_RECEIPT_URL =
  "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80";

function getCategoryBadgeClassName(categoryLabel: string) {
  const normalizedCategory = categoryLabel.toLocaleLowerCase("bg-BG");

  if (
    normalizedCategory.includes("\u0445\u0440\u0430\u043d\u0430") ||
    normalizedCategory.includes("\u043d\u0430\u043f\u0438\u0442") ||
    normalizedCategory.includes("food")
  ) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  }

  if (
    normalizedCategory.includes("\u043a\u043e\u043c\u0443\u043d") ||
    normalizedCategory.includes("\u0442\u043e\u043a") ||
    normalizedCategory.includes("\u0432\u043e\u0434\u0430") ||
    normalizedCategory.includes("utilities")
  ) {
    return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }

  if (
    normalizedCategory.includes("\u043f\u043e\u0434\u0434\u0440") ||
    normalizedCategory.includes("\u0440\u0435\u043c\u043e\u043d\u0442") ||
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

function TransactionActions({
  row,
  actionsLabel,
  viewReceiptLabel,
  editLabel,
  deleteLabel,
  onViewReceipt,
}: TransactionActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={actionsLabel}
          className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200/70 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56 rounded-xl">
        {row.hasReceipt && onViewReceipt ? (
          <DropdownMenuItem onClick={onViewReceipt}>
            <ImageIcon className="size-4" />
            {viewReceiptLabel}
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuItem>
          <Pencil className="size-4" />
          {editLabel}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300">
          <Trash2 className="size-4" />
          {deleteLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

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
          viewReceipt: "Виж бележката",
          edit: "Редактирай",
          delete: "Изтрий",
          receiptTitle: "Касова бележка",
          receiptAlt: "Касова бележка",
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
          viewReceipt: "View receipt",
          edit: "Edit",
          delete: "Delete",
          receiptTitle: "Receipt",
          receiptAlt: "Receipt image",
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
    <>
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
                        <TransactionActions
                          row={row}
                          actionsLabel={copy.columns.actions}
                          viewReceiptLabel={copy.viewReceipt}
                          editLabel={copy.edit}
                          deleteLabel={copy.delete}
                          onViewReceipt={
                            row.hasReceipt
                              ? () => {
                                  setSelectedReceipt(MOCK_RECEIPT_URL);
                                  setReceiptViewerOpen(true);
                                }
                              : undefined
                          }
                        />
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

                        <TransactionActions
                          row={row}
                          actionsLabel={copy.columns.actions}
                          viewReceiptLabel={copy.viewReceipt}
                          editLabel={copy.edit}
                          deleteLabel={copy.delete}
                          onViewReceipt={
                            row.hasReceipt
                              ? () => {
                                  setSelectedReceipt(MOCK_RECEIPT_URL);
                                  setReceiptViewerOpen(true);
                                }
                              : undefined
                          }
                        />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={receiptViewerOpen}
        onOpenChange={(open) => {
          setReceiptViewerOpen(open);
          if (!open) {
            setSelectedReceipt(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.receiptTitle}</DialogTitle>
          </DialogHeader>
          {selectedReceipt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedReceipt}
              alt={copy.receiptAlt}
              className="w-full rounded-xl object-cover"
            />
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200/70 bg-slate-50 px-6 py-12 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <Eye className="mr-2 size-4" />
              {copy.receiptAlt}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

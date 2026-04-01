"use client";

import Link from "next/link";
import { useDeferredValue, useState, useCallback } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  HelpCircle,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  ReceiptText,
  Search,
  SortAsc,
  Trash2,
  X,
  Loader2,
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
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { DailyReportWithAttendance, SnapshotMode } from "@/lib/types";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;
const MOCK_RECEIPT_FALLBACK =
  "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&q=80";

type SortField = "date" | "amount" | "category";
type SortDir = "asc" | "desc";

// ── Props ─────────────────────────────────────────────────────────────────────
type TransactionsPageClientProps = {
  reports: DailyReportWithAttendance[];
  dataMode: SnapshotMode;
};

// ── Category badge ─────────────────────────────────────────────────────────
function getCategoryBadgeClassName(categoryLabel: string) {
  const n = categoryLabel.toLocaleLowerCase("bg-BG");
  if (n.includes("храна") || n.includes("напит") || n.includes("food"))
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (n.includes("комун") || n.includes("ток") || n.includes("вода") || n.includes("utilities"))
    return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (n.includes("подд") || n.includes("ремонт") || n.includes("maintenance"))
    return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  if (n.includes("транс") || n.includes("transport"))
    return "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

// ── Sort ───────────────────────────────────────────────────────────────────
function sortRows(rows: TransactionRow[], field: SortField, dir: SortDir) {
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (field === "date")
      cmp = (a.createdAt ?? a.workDate).localeCompare(b.createdAt ?? b.workDate);
    else if (field === "amount") cmp = a.amount - b.amount;
    else cmp = a.categoryLabel.localeCompare(b.categoryLabel, "bg");
    return dir === "asc" ? cmp : -cmp;
  });
}

// ── Receipt image URL resolver (client-side Supabase Storage) ──────────────
function resolveReceiptUrl(
  receiptImagePath: string | null,
  isMockData: boolean,
): string | null {
  if (isMockData) return MOCK_RECEIPT_FALLBACK;
  if (!receiptImagePath) return null;
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data } = client.storage.from("receipts").getPublicUrl(receiptImagePath);
  return data?.publicUrl ?? null;
}

// ── Source pill ────────────────────────────────────────────────────────────
function SourcePill({ sourceType, locale }: { sourceType: TransactionRow["sourceType"]; locale: "bg" | "en" }) {
  if (sourceType === "telegram") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        ✈ Telegram
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {locale === "bg" ? "Уеб" : "Web"}
    </span>
  );
}

// ── Row actions dropdown ───────────────────────────────────────────────────
function RowActions({
  row,
  isMockData,
  labels,
  onViewReceipt,
}: {
  row: TransactionRow;
  isMockData: boolean;
  labels: { actions: string; viewReceipt: string; edit: string; delete: string };
  onViewReceipt: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={labels.actions}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52 rounded-xl">
          {(row.hasReceipt || isMockData) && (
            <DropdownMenuItem onClick={onViewReceipt}>
              <ImageIcon className="size-4" />
              {labels.viewReceipt}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem>
            <Pencil className="size-4" />
            {labels.edit}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="size-4" />
            {labels.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {labels.delete} «{row.description}»?
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="h-11 rounded-xl"
            >
              Отказ
            </Button>
            <Button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="h-11 rounded-xl bg-rose-600 text-white hover:bg-rose-700"
            >
              {labels.delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Receipt viewer dialog ──────────────────────────────────────────────────
function ReceiptDialog({
  open,
  onClose,
  receiptUrl,
  description,
  title,
}: {
  open: boolean;
  onClose: () => void;
  receiptUrl: string | null;
  description: string;
  title: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const handleClose = useCallback(() => {
    setLoaded(false);
    setErrored(false);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">{description}</p>
        </DialogHeader>
        <div className="p-5">
          {receiptUrl ? (
            <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
              {!loaded && !errored && (
                <div className="flex h-56 items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-slate-400" />
                </div>
              )}
              {errored && (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
                  <Eye className="size-6" />
                  <p className="text-xs">Изображението не може да се зареди</p>
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptUrl}
                alt={title}
                className={cn(
                  "w-full rounded-xl object-contain transition-opacity duration-200",
                  loaded ? "opacity-100" : "opacity-0 absolute inset-0",
                )}
                onLoad={() => setLoaded(true)}
                onError={() => { setLoaded(true); setErrored(true); }}
              />
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700">
              <Eye className="mr-2 size-4" />
              {title}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Info dialog ────────────────────────────────────────────────────────────
function InfoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="rounded-2xl p-0 sm:max-w-sm">
        <DialogHeader className="border-b border-slate-100 px-5 py-4 pr-14 dark:border-slate-800">
          <DialogTitle>Какво е транзакция?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-5 text-sm text-slate-600 dark:text-slate-400">
          <p>
            Транзакцията е всеки записан разход за деня — храна, наем, комунални, консумативи и др.
          </p>
          <div className="space-y-2">
            {[
              { icon: "🌐", label: "Уеб", desc: "Въведен ръчно от дневния отчет в приложението." },
              { icon: "✈️", label: "Telegram", desc: "Изпратен чрез бота — текст или снимка на касова бележка." },
              { icon: "🧾", label: "Касова бележка", desc: "Прикачена снимка, която потвърждава разхода." },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900">
                <span className="mt-0.5 text-base leading-none">{item.icon}</span>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Всеки разход се записва в EUR и се показва с BGN еквивалент по фиксиран курс 1 EUR = 1.95583 BGN.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ title, copy, ctaLabel, ctaHref }: { title: string; copy: string; ctaLabel?: string; ctaHref?: string }) {
  return (
    <div className="mx-auto flex max-w-xs flex-col items-center gap-4 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
        <ReceiptText className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{copy}</p>
      </div>
      {ctaLabel && ctaHref && (
        <Button asChild className="h-11 rounded-xl bg-emerald-600 px-5 text-white hover:bg-emerald-700">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      )}
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────
function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build page list with smart ellipsis
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  const withEllipsis: (number | "…")[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && (pages[i] as number) - (pages[i - 1] as number) > 1) {
      withEllipsis.push("…");
    }
    withEllipsis.push(pages[i]);
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="size-9 rounded-xl border-slate-200 p-0 dark:border-slate-700"
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Предишна страница"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {withEllipsis.map((p, i) =>
        p === "…" ? (
          <span key={`e-${i}`} className="px-1 text-sm text-slate-400">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p as number)}
            className={cn(
              "h-9 min-w-9 rounded-xl px-3 text-sm font-semibold transition-colors",
              page === p
                ? "bg-emerald-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
          >
            {p}
          </button>
        ),
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="size-9 rounded-xl border-slate-200 p-0 dark:border-slate-700"
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label="Следваща страница"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export function TransactionsPageClient({ reports, dataMode }: TransactionsPageClientProps) {
  const { locale } = useLocale();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Sort state
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Pagination
  const [page, setPage] = useState(1);

  // Dialogs
  const [receiptRow, setReceiptRow] = useState<TransactionRow | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const { rows, isMockData } = resolveTransactionRows(reports, dataMode);

  // Pipeline: filter → sort → paginate
  const filtered = filterTransactionRows(rows, { searchQuery: deferredQuery, fromDate, toDate });
  const sorted = sortRows(filtered, sortField, sortDir);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasActiveDateFilters = Boolean(fromDate || toDate);
  const showEmpty = !isMockData && rows.length === 0;
  const showNoResults = rows.length > 0 && filtered.length === 0;

  function handleSearch(v: string) {
    setSearchQuery(v);
    setPage(1);
  }

  function handleSort(field: SortField) {
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
    setPage(1);
  }

  function exportCsv() {
    if (sorted.length === 0 || typeof window === "undefined") return;
    const label = locale === "bg" ? "Транзакции" : "Transactions";
    const blob = new Blob([buildTransactionsCsvContent(sorted)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildTransactionsCsvFilename(label);
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const copy =
    locale === "bg"
      ? {
          title: "Транзакции",
          subtitle: "История на всички разходи и касови бележки",
          searchPlaceholder: "Търси разход...",
          filterButton: "Дата",
          exportButton: "CSV",
          fromDate: "От дата",
          toDate: "До дата",
          reset: "Изчисти",
          viewReceipt: "Виж бележката",
          edit: "Редактирай",
          delete: "Изтрий",
          receiptTitle: "Касова бележка",
          sampleData: "Примерни записи",
          actions: "Действия",
          sortBy: "Сортирай",
          sortDate: "Дата",
          sortAmount: "Сума",
          sortCategory: "Категория",
          showing: "Показани",
          of: "от",
          results: "записа",
          pageLabel: "Страница",
          noResultsTitle: "Няма намерени транзакции",
          noResultsCopy: "Промени търсенето или филтрите по дата.",
          emptyTitle: "Няма транзакции",
          emptyCopy: "Добави първия разход от дневния отчет.",
          emptyCta: "Добави разход",
        }
      : {
          title: "Transactions",
          subtitle: "History of all expenses and receipt records",
          searchPlaceholder: "Search expenses...",
          filterButton: "Date",
          exportButton: "CSV",
          fromDate: "From date",
          toDate: "To date",
          reset: "Reset",
          viewReceipt: "View receipt",
          edit: "Edit",
          delete: "Delete",
          receiptTitle: "Receipt",
          sampleData: "Sample rows",
          actions: "Actions",
          sortBy: "Sort",
          sortDate: "Date",
          sortAmount: "Amount",
          sortCategory: "Category",
          showing: "Showing",
          of: "of",
          results: "results",
          pageLabel: "Page",
          noResultsTitle: "No transactions found",
          noResultsCopy: "Adjust your search or date filters.",
          emptyTitle: "No transactions",
          emptyCopy: "Add your first expense from the daily report.",
          emptyCta: "Add expense",
        };

  const sortLabels: Record<SortField, string> = {
    date: copy.sortDate,
    amount: copy.sortAmount,
    category: copy.sortCategory,
  };

  const receiptUrl = receiptRow
    ? resolveReceiptUrl(receiptRow.receiptImagePath, isMockData)
    : null;

  return (
    <>
      {/* ── Page shell ──────────────────────────────────────────────── */}
      <div className="min-h-screen bg-slate-50/50 pb-28 dark:bg-slate-950 lg:pb-10">
        <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">

          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {copy.title}
                </h1>
                <button
                  type="button"
                  onClick={() => setInfoOpen(true)}
                  aria-label="Какво е транзакция?"
                  className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <HelpCircle className="size-4.5" />
                </button>
                {isMockData && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {copy.sampleData}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
            </div>

            <Button
              type="button"
              onClick={exportCsv}
              disabled={sorted.length === 0}
              className="h-10 shrink-0 rounded-xl bg-emerald-600 px-4 text-sm text-white hover:bg-emerald-700"
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">{copy.exportButton}</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          </div>

          {/* ── Toolbar ──────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex gap-2 p-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="h-10 rounded-xl border-slate-200/70 bg-slate-50 pl-9 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Изчисти търсенето"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Date filter toggle */}
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-10 rounded-xl border-slate-200/70 px-3 text-sm dark:border-slate-700",
                  (dateFilterOpen || hasActiveDateFilters) &&
                    "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400",
                )}
                onClick={() => setDateFilterOpen((v) => !v)}
              >
                <Calendar className="size-4" />
                <span className="hidden sm:inline">{copy.filterButton}</span>
                {hasActiveDateFilters && (
                  <span className="size-2 rounded-full bg-emerald-500" />
                )}
              </Button>

              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-slate-200/70 px-3 text-sm dark:border-slate-700"
                  >
                    <SortAsc className="size-4" />
                    <span className="hidden sm:inline">{copy.sortBy}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-44 rounded-xl">
                  {(["date", "amount", "category"] as SortField[]).map((field) => (
                    <DropdownMenuItem
                      key={field}
                      onClick={() => handleSort(field)}
                      className={cn(
                        sortField === field && "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
                      )}
                    >
                      {sortLabels[field]}
                      {sortField === field && (
                        <span className="ml-auto text-xs text-slate-400">
                          {sortDir === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Date filter panel */}
            {dateFilterOpen && (
              <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-[1fr_1fr_auto] dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {copy.fromDate}
                  </label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                    className="h-10 rounded-xl border-slate-200/70 bg-white text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {copy.toDate}
                  </label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                    className="h-10 rounded-xl border-slate-200/70 bg-white text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFromDate(""); setToDate(""); setPage(1); }}
                    disabled={!hasActiveDateFilters}
                    className="h-10 rounded-xl px-3 text-sm text-slate-500"
                  >
                    {copy.reset}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Results counter ───────────────────────────────────────── */}
          {sorted.length > 0 && (
            <div className="flex items-center justify-between px-1 text-xs text-slate-500">
              <span>
                {copy.showing}{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)}
                </strong>{" "}
                {copy.of}{" "}
                <strong className="text-slate-700 dark:text-slate-300">{sorted.length}</strong>{" "}
                {copy.results}
              </span>
              <span>
                {copy.pageLabel} {safePage} / {totalPages}
              </span>
            </div>
          )}

          {/* ── Table + card list ─────────────────────────────────────── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

            {showEmpty ? (
              <EmptyState
                title={copy.emptyTitle}
                copy={copy.emptyCopy}
                ctaLabel={copy.emptyCta}
                ctaHref="/today?task=expenses"
              />
            ) : showNoResults ? (
              <EmptyState title={copy.noResultsTitle} copy={copy.noResultsCopy} />
            ) : (
              <>
                {/* Desktop table — md and up */}
                <table className="hidden min-w-full border-collapse text-sm md:table">
                  <thead className="bg-slate-50/80 dark:bg-slate-950/60">
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3 text-left">Дата</th>
                      <th className="px-5 py-3 text-left">Описание</th>
                      <th className="px-5 py-3 text-left">Категория</th>
                      <th className="px-5 py-3 text-right">Сума</th>
                      <th className="px-3 py-3 text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-950/30"
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-slate-500">
                          {formatDateLabel(row.workDate, locale)}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900 dark:text-white">{row.description}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <SourcePill sourceType={row.sourceType} locale={locale} />
                            {row.hasReceipt && (
                              <span className="text-[10px] text-slate-400">🧾</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", getCategoryBadgeClassName(row.categoryLabel))}>
                            {row.categoryLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <RowActions
                            row={row}
                            isMockData={isMockData}
                            labels={{ actions: copy.actions, viewReceipt: copy.viewReceipt, edit: copy.edit, delete: copy.delete }}
                            onViewReceipt={() => setReceiptRow(row)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile list — below md */}
                <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
                  {paginated.map((row) => (
                    <div key={row.id} className="flex items-start gap-3 px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        {/* Line 1: description + amount */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">
                            {row.description}
                          </p>
                          <p className="shrink-0 font-bold tabular-nums text-slate-900 dark:text-white">
                            {formatCurrency(row.amount)}
                          </p>
                        </div>
                        {/* Line 2: date + category + source */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-slate-400">
                            {formatDateLabel(row.workDate, locale)}
                          </span>
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", getCategoryBadgeClassName(row.categoryLabel))}>
                            {row.categoryLabel}
                          </span>
                          <SourcePill sourceType={row.sourceType} locale={locale} />
                          {row.hasReceipt && (
                            <button
                              type="button"
                              onClick={() => setReceiptRow(row)}
                              className="text-[11px] text-slate-400 hover:text-emerald-600 transition-colors"
                              title={copy.viewReceipt}
                            >
                              🧾
                            </button>
                          )}
                        </div>
                      </div>
                      <RowActions
                        row={row}
                        isMockData={isMockData}
                        labels={{ actions: copy.actions, viewReceipt: copy.viewReceipt, edit: copy.edit, delete: copy.delete }}
                        onViewReceipt={() => setReceiptRow(row)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Pagination ────────────────────────────────────────────── */}
          <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────────── */}
      <ReceiptDialog
        open={Boolean(receiptRow)}
        onClose={() => setReceiptRow(null)}
        receiptUrl={receiptUrl}
        description={receiptRow?.description ?? ""}
        title={copy.receiptTitle}
      />

      <InfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );
}

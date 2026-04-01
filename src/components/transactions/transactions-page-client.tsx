"use client";

import { format, isSameYear, isToday, isYesterday, parseISO } from "date-fns";
import { bg, enUS } from "date-fns/locale";
import Link from "next/link";
import { useDeferredValue, useState, useCallback } from "react";
import {
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  HelpCircle,
  Image as ImageIcon,
  Package,
  Paperclip,
  MoreHorizontal,
  Pencil,
  ReceiptText,
  Search,
  SortAsc,
  Store,
  Trash2,
  Truck,
  UtensilsCrossed,
  Wrench,
  X,
  Loader2,
  Zap,
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
  groupTransactionRowsByDate,
  resolveTransactionRows,
  type TransactionDayGroup,
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
function getDateFnsLocale(locale: "bg" | "en") {
  return locale === "bg" ? bg : enUS;
}

function formatTransactionDayTitle(workDate: string, locale: "bg" | "en") {
  const date = parseISO(workDate);

  if (isToday(date)) {
    return locale === "bg" ? "Днес" : "Today";
  }

  if (isYesterday(date)) {
    return locale === "bg" ? "Вчера" : "Yesterday";
  }

  return format(date, isSameYear(date, new Date()) ? "d MMMM" : "d MMMM yyyy", {
    locale: getDateFnsLocale(locale),
  });
}

function formatTransactionTime(createdAt: string | null, locale: "bg" | "en") {
  if (!createdAt) {
    return locale === "bg" ? "Без час" : "No time";
  }

  return new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function formatTransactionId(id: string) {
  return `#${id.slice(0, 8)}`;
}

function formatExpenseCount(count: number, locale: "bg" | "en") {
  if (locale === "bg") {
    return `${count} ${count === 1 ? "разход" : "разхода"}`;
  }

  return `${count} ${count === 1 ? "expense" : "expenses"}`;
}

function formatDayCount(count: number, locale: "bg" | "en") {
  if (locale === "bg") {
    return `${count} ${count === 1 ? "ден" : "дни"}`;
  }

  return `${count} ${count === 1 ? "day" : "days"}`;
}

function getTransactionIconKey(row: TransactionRow) {
  const n = row.categoryLabel.toLocaleLowerCase("bg-BG");
  if (n.includes("храна") || n.includes("напит") || n.includes("food")) {
    return "food";
  }

  if (
    n.includes("комун") ||
    n.includes("ток") ||
    n.includes("вода") ||
    n.includes("utilities")
  ) {
    return "utilities";
  }

  if (n.includes("подд") || n.includes("ремонт") || n.includes("maintenance")) {
    return "maintenance";
  }

  if (n.includes("транс") || n.includes("transport")) {
    return "transport";
  }

  if (
    n.includes("консум") ||
    n.includes("suppl") ||
    n.includes("inventory") ||
    n.includes("package")
  ) {
    return "supplies";
  }

  if (n.includes("наем") || n.includes("rent")) {
    return "rent";
  }

  if (n.includes("Ñ…Ñ€Ð°Ð½Ð°") || n.includes("Ð½Ð°Ð¿Ð¸Ñ‚") || n.includes("food")) {
    return "food";
  }

  if (
    n.includes("ÐºÐ¾Ð¼ÑƒÐ½") ||
    n.includes("Ñ‚Ð¾Ðº") ||
    n.includes("Ð²Ð¾Ð´Ð°") ||
    n.includes("utilities")
  ) {
    return "utilities";
  }

  if (n.includes("Ð¿Ð¾Ð´Ð´") || n.includes("Ñ€ÐµÐ¼Ð¾Ð½Ñ‚") || n.includes("maintenance")) {
    return "maintenance";
  }

  if (n.includes("Ñ‚Ñ€Ð°Ð½Ñ") || n.includes("transport")) {
    return "transport";
  }

  if (
    n.includes("ÐºÐ¾Ð½ÑÑƒÐ¼") ||
    n.includes("suppl") ||
    n.includes("inventory") ||
    n.includes("package")
  ) {
    return "supplies";
  }

  if (n.includes("Ð½Ð°ÐµÐ¼") || n.includes("rent")) {
    return "rent";
  }

  return row.sourceType === "telegram" ? "telegram" : "web";
}

function TransactionIcon({ row }: { row: TransactionRow }) {
  const iconClassName = "size-5";
  const iconKey = getTransactionIconKey(row);

  if (iconKey === "food") {
    return <UtensilsCrossed className={iconClassName} />;
  }

  if (iconKey === "utilities") {
    return <Zap className={iconClassName} />;
  }

  if (iconKey === "maintenance") {
    return <Wrench className={iconClassName} />;
  }

  if (iconKey === "transport") {
    return <Truck className={iconClassName} />;
  }

  if (iconKey === "supplies") {
    return <Package className={iconClassName} />;
  }

  if (iconKey === "rent") {
    return <Store className={iconClassName} />;
  }

  if (iconKey === "telegram") {
    return <Bot className={iconClassName} />;
  }

  return <ReceiptText className={iconClassName} />;
}

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
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        <Bot className="size-3" />
        Telegram
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <ReceiptText className="size-3" />
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
type TransactionRowActionLabels = {
  actions: string;
  viewReceipt: string;
  edit: string;
  delete: string;
};

type TransactionGroupLabels = TransactionRowActionLabels & {
  dailyTotal: string;
};

function TransactionFeedRow({
  row,
  locale,
  isMockData,
  labels,
  onViewReceipt,
}: {
  row: TransactionRow;
  locale: "bg" | "en";
  isMockData: boolean;
  labels: TransactionRowActionLabels;
  onViewReceipt: () => void;
}) {
  const canViewReceipt = row.hasReceipt || isMockData;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-4 py-4 sm:gap-4 sm:px-5">
      <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
        <TransactionIcon row={row} />
      </div>

      <div className="min-w-0">
        <p className="break-words text-[15px] font-semibold leading-5 text-slate-900 dark:text-white sm:text-base">
          {row.description}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
              getCategoryBadgeClassName(row.categoryLabel),
            )}
          >
            {row.categoryLabel}
          </span>
          <SourcePill sourceType={row.sourceType} locale={locale} />
          <span>{formatTransactionTime(row.createdAt, locale)}</span>
          <span className="font-mono text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {formatTransactionId(row.id)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <p className="whitespace-nowrap text-[15px] font-bold tabular-nums text-slate-900 dark:text-white sm:text-base">
          {formatCurrency(row.amount)}
        </p>

        <div className="flex items-center gap-1">
          {canViewReceipt && (
            <button
              type="button"
              onClick={onViewReceipt}
              aria-label={labels.viewReceipt}
              title={labels.viewReceipt}
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
            >
              <Paperclip className="size-4" />
            </button>
          )}

          <RowActions
            row={row}
            isMockData={isMockData}
            labels={labels}
            onViewReceipt={onViewReceipt}
          />
        </div>
      </div>
    </div>
  );
}

function TransactionDailyGroupCard({
  group,
  locale,
  isMockData,
  labels,
  onViewReceipt,
}: {
  group: TransactionDayGroup;
  locale: "bg" | "en";
  isMockData: boolean;
  labels: TransactionGroupLabels;
  onViewReceipt: (row: TransactionRow) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
            {formatTransactionDayTitle(group.workDate, locale)}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {formatDateLabel(group.workDate, locale)} · {formatExpenseCount(group.rows.length, locale)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {labels.dailyTotal}
          </p>
          <p className="mt-1 text-base font-bold tabular-nums text-slate-900 dark:text-white sm:text-lg">
            {formatCurrency(group.totalAmount)}
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {group.rows.map((row) => (
          <TransactionFeedRow
            key={row.id}
            row={row}
            locale={locale}
            isMockData={isMockData}
            labels={labels}
            onViewReceipt={() => onViewReceipt(row)}
          />
        ))}
      </div>
    </section>
  );
}

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

  // Pipeline: filter -> group by day -> sort rows within each day -> paginate groups
  const filtered = filterTransactionRows(rows, {
    searchQuery: deferredQuery,
    fromDate,
    toDate,
  });
  const grouped = groupTransactionRowsByDate(
    filtered,
    sortField === "date" ? sortDir : "desc",
  ).map((group) => ({
    ...group,
    rows: sortRows(group.rows, sortField, sortDir),
  }));
  const flatRowsForExport = grouped.flatMap((group) => group.rows);
  const totalPages = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedGroups = grouped.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

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
    if (flatRowsForExport.length === 0 || typeof window === "undefined") return;
    const label = locale === "bg" ? "Транзакции" : "Transactions";
    const blob = new Blob([buildTransactionsCsvContent(flatRowsForExport)], {
      type: "text/csv;charset=utf-8;",
    });
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
          dailyTotal: "Общо за деня",
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
          dailyTotal: "Daily total",
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
              disabled={flatRowsForExport.length === 0}
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
          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-1 text-xs text-slate-500">
              <span>
                <strong className="text-slate-700 dark:text-slate-300">
                  {formatExpenseCount(filtered.length, locale)}
                </strong>{" "}
                <span className="text-slate-400">·</span>{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  {formatDayCount(grouped.length, locale)}
                </strong>
              </span>
              <span>
                {copy.pageLabel} {safePage} / {totalPages}
              </span>
            </div>
          )}

          {/* ── Daily transaction groups ──────────────────────────────── */}
          {showEmpty ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <EmptyState
                title={copy.emptyTitle}
                copy={copy.emptyCopy}
                ctaLabel={copy.emptyCta}
                ctaHref="/today?task=expenses"
              />
            </div>
          ) : showNoResults ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <EmptyState title={copy.noResultsTitle} copy={copy.noResultsCopy} />
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedGroups.map((group) => (
                <TransactionDailyGroupCard
                  key={group.workDate}
                  group={group}
                  locale={locale}
                  isMockData={isMockData}
                  labels={{
                    actions: copy.actions,
                    viewReceipt: copy.viewReceipt,
                    edit: copy.edit,
                    delete: copy.delete,
                    dailyTotal: copy.dailyTotal,
                  }}
                  onViewReceipt={setReceiptRow}
                />
              ))}
            </div>
          )}

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

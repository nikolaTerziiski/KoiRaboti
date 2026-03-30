"use client";

import { useActionState, useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ChevronRight,
  Plus,
  ReceiptText,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import type { TodayActionState } from "@/actions/today";
import { saveTodayReportAction } from "@/actions/today";
import type { ExpenseEditorDraftItem } from "@/components/expenses/expense-items-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { calculateExpenseTotal } from "@/lib/expenses";
import { useLocale } from "@/lib/i18n/context";
import {
  formatBgnCurrencyFromEur,
  formatDateLabel,
  formatExchangeRateLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  DailyReportWithAttendance,
  Employee,
  EmployeeRole,
  ExpenseCategory,
  PayUnits,
  SnapshotMode,
} from "@/lib/types";

const initialTodayActionState: TodayActionState = {
  status: "idle",
  message: null,
  messageKey: null,
  refreshKey: null,
};

type TodayDashboardProps = {
  employees: Employee[];
  expenseCategories: ExpenseCategory[];
  initialReport: DailyReportWithAttendance;
  dataMode: SnapshotMode;
  initialTask?: TaskKey | null;
};

type AttendanceDraft = {
  employee: Employee;
  isPresent: boolean;
  payUnits: PayUnits;
  dailyRate: number;
};

export type TaskKey = "finance" | "attendance" | "expenses";

type TaskTileProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  description: string;
  completed: boolean;
  pendingLabel: string;
  doneLabel: string;
  icon: LucideIcon;
  accentClassName: string;
};

const ROLE_ORDER: EmployeeRole[] = ["kitchen", "service"];
const SHIFT_OPTIONS: Array<0 | PayUnits> = [0, 1, 1.5, 2];

function toNumber(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatShiftUnits(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildAttendanceDrafts(
  employees: Employee[],
  initialReport: DailyReportWithAttendance,
) {
  return employees
    .filter((employee) => employee.isActive)
    .map((employee) => {
      const entry = initialReport.attendanceEntries.find(
        (attendance) => attendance.employeeId === employee.id,
      );

      return {
        employee,
        isPresent: Boolean(entry),
        payUnits: entry?.payUnits ?? 1,
        dailyRate: entry?.dailyRate ?? employee.dailyRate,
      };
    });
}

function buildExpenseDrafts(
  expenseCategories: ExpenseCategory[],
  initialReport: DailyReportWithAttendance,
): ExpenseEditorDraftItem[] {
  if (initialReport.expenseItems.length === 0) {
    return [];
  }

  return initialReport.expenseItems.map((item) => ({
    id: item.id,
    categoryId: item.categoryId,
    amount: String(item.amount),
    description: item.description ?? "",
    sourceType: item.sourceType,
    receiptImagePath: item.receiptImagePath,
    receiptOcrText: item.receiptOcrText,
    telegramUserId: item.telegramUserId,
    amountOriginal: item.amountOriginal,
    currencyOriginal: item.currencyOriginal,
    categoryName:
      item.categoryName ??
      expenseCategories.find((category) => category.id === item.categoryId)?.name ??
      null,
    categoryEmoji:
      item.categoryEmoji ??
      expenseCategories.find((category) => category.id === item.categoryId)?.emoji ??
      null,
    createdAt: item.createdAt,
  }));
}

function createExpenseDraftItem(category: ExpenseCategory | null): ExpenseEditorDraftItem {
  return {
    id: crypto.randomUUID(),
    categoryId: category?.id ?? null,
    amount: "",
    description: "",
    sourceType: "web",
    receiptImagePath: null,
    receiptOcrText: null,
    telegramUserId: null,
    amountOriginal: null,
    currencyOriginal: "EUR",
    categoryName: category?.name ?? null,
    categoryEmoji: category?.emoji ?? null,
    createdAt: null,
  };
}

function TaskTile({
  title,
  description,
  completed,
  pendingLabel,
  doneLabel,
  icon: Icon,
  accentClassName,
  className,
  type = "button",
  ...props
}: TaskTileProps) {
  return (
    <button
      type={type}
      className={cn(
        "flex h-full w-full flex-col items-start rounded-[1.75rem] border-2 p-6 text-left transition-all duration-300 hover:scale-[1.02]",
        completed
          ? "border-emerald-200 bg-emerald-50 shadow-sm ring-1 ring-emerald-500/20 dark:border-emerald-800/80 dark:bg-emerald-900/20"
          : "border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
      {...props}
    >
      <div className={cn("flex size-16 items-center justify-center rounded-3xl", accentClassName)}>
        <Icon className="size-7" />
      </div>
      <div className="mt-6 space-y-2">
        <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h3>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      <div className="mt-auto flex w-full items-center justify-between pt-6">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
            completed
              ? "bg-white text-emerald-700 dark:bg-slate-900 dark:text-emerald-400"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
          )}
        >
          {completed ? <CheckCircle2 className="size-4" /> : <ChevronRight className="size-4" />}
          {completed ? doneLabel : pendingLabel}
        </span>
        <ChevronRight className="size-5 text-slate-300 dark:text-slate-600" />
      </div>
    </button>
  );
}

export function TodayDashboard({
  employees,
  expenseCategories,
  initialReport,
  dataMode,
  initialTask = null,
}: TodayDashboardProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const refreshedKeyRef = useRef<string | null>(null);
  const readyTimeoutRef = useRef<number | null>(null);
  const [actionState, formAction, isPending] = useActionState(
    saveTodayReportAction,
    initialTodayActionState,
  );
  const [reportForm, setReportForm] = useState({
    turnover: String(initialReport.turnover),
    profit: String(initialReport.profit),
    cardAmount: String(initialReport.cardAmount),
    notes: initialReport.notes ?? "",
  });
  const [attendanceDrafts, setAttendanceDrafts] = useState<AttendanceDraft[]>(
    buildAttendanceDrafts(employees, initialReport),
  );
  const [expenseDrafts, setExpenseDrafts] = useState<ExpenseEditorDraftItem[]>(
    buildExpenseDrafts(expenseCategories, initialReport),
  );
  const [activeDialog, setActiveDialog] = useState<TaskKey | null>(initialTask || null);
  const [isFinishAttentionActive, setIsFinishAttentionActive] = useState(false);
  const [isFinanceDone, setIsFinanceDone] = useState(
    !initialReport.id.startsWith("report-"),
  );
  const [isAttendanceDone, setIsAttendanceDone] = useState(
    initialReport.attendanceEntries.length > 0,
  );
  const [isExpensesDone, setIsExpensesDone] = useState(
    initialReport.expenseItems.length > 0,
  );

  useEffect(() => {
    if (
      actionState.status === "success" &&
      actionState.refreshKey &&
      refreshedKeyRef.current !== actionState.refreshKey
    ) {
      refreshedKeyRef.current = actionState.refreshKey;
      router.refresh();
    }
  }, [actionState, router]);

  const totalExpense = calculateExpenseTotal(
    expenseDrafts.map((item) => ({ amount: toNumber(item.amount) })),
  );
  const checkedInCount = attendanceDrafts.filter((entry) => entry.isPresent).length;
  const totalPayUnits = attendanceDrafts.reduce(
    (sum, entry) => sum + (entry.isPresent ? entry.payUnits : 0),
    0,
  );
  const allTasksComplete = isFinanceDone && isAttendanceDone && isExpensesDone;
  const isFinishReady = allTasksComplete && dataMode !== "demo";
  const completedCount = [isFinanceDone, isAttendanceDone, isExpensesDone].filter(Boolean)
    .length;

  useEffect(() => {
    return () => {
      if (readyTimeoutRef.current) {
        window.clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
    };
  }, []);

  const copy =
    locale === "bg"
      ? {
          title: "Дневен Отчет",
          subtitle: "Изпълнете задачите си за деня.",
          progress: "Завършени задачи",
          pending: "Чакащо",
          done: "Завършено",
          finish: "Приключи Деня",
          finishHint: "Финалното запазване изпраща целия отчет към системата.",
          demoNote:
            "Демо режимът остава интерактивен, но финалното запазване е изключено.",
          finance: [
            "1. Оборот и Каса",
            "Въведете дневните приходи и бележки.",
            "Финанси",
            "Попълни оборот, печалба, карти и бележки.",
            "Запази Финанси",
          ] as const,
          attendance: [
            "2. Персонал",
            "Отбележете присъствията и смените.",
            "Персонал",
            "Маркирай кой е на работа и колко смени прави днес.",
            "Запази Присъствия",
          ] as const,
          expenses: [
            "3. Разходи",
            "Потвърдете днешните разходи и касови бележки.",
            "Разходи",
            "Прегледай mini ledger-а и добави разходите за деня.",
            "Потвърди Разходите",
          ] as const,
          totalExpense: "Общ разход",
          addExpense: "Добави разход",
          remove: "Премахни",
          category: "Категория",
          amount: "Сума (EUR)",
          note: "Бележка",
          notePlaceholder: "Кратко описание на разхода",
          uncategorized: "Без категория",
          emptyExpenses: "Все още няма добавени разходи за този ден.",
          noEmployees: "Няма активни служители за днес.",
          telegram: "От Telegram",
          receipt: "Касова бележка",
          saveSuccess: "Дневният отчет и присъствието бяха запазени.",
          saveError: "Запазването неуспешно. Моля, опитай отново.",
        }
      : {
          title: "Daily Report",
          subtitle: "Complete your tasks for the day.",
          progress: "Completed tasks",
          pending: "Pending",
          done: "Done",
          finish: "Finish Day",
          finishHint: "The final save submits the full report to the system.",
          demoNote: "Demo mode stays interactive, but the final save remains disabled.",
          finance: [
            "1. Revenue and Cash",
            "Enter the daily numbers and notes.",
            "Finance",
            "Fill turnover, profit, cards, and notes.",
            "Save Finance",
          ] as const,
          attendance: [
            "2. Staff",
            "Review attendance and shift units.",
            "Attendance",
            "Mark who is working and how many shifts they cover.",
            "Save Attendance",
          ] as const,
          expenses: [
            "3. Expenses",
            "Confirm today's expenses and receipts.",
            "Expenses",
            "Review the mini ledger and add today's expenses.",
            "Confirm Expenses",
          ] as const,
          totalExpense: "Total expense",
          addExpense: "Add expense",
          remove: "Remove",
          category: "Category",
          amount: "Amount (EUR)",
          note: "Note",
          notePlaceholder: "Short expense description",
          uncategorized: "Uncategorized",
          emptyExpenses: "No expenses have been added for this day yet.",
          noEmployees: "There are no active employees for today.",
          telegram: "From Telegram",
          receipt: "Receipt",
          saveSuccess: "Today report and attendance were saved.",
          saveError: "Could not save. Please try again.",
        };

  const attendanceHint =
    locale === "bg"
      ? "Избери хората по групи и маркирай колко смени поема всеки."
      : "Choose people by group and set how many shifts each person is covering today.";
  const attendanceSummaryLabel = locale === "bg" ? "избрани" : "selected";
  const shiftsSummaryLabel = locale === "bg" ? "смени" : "shifts";
  const attendanceLocalDraftNotice =
    locale === "bg"
      ? "Промените се пазят локално веднага. Натисни „Запази Присъствия“, за да потвърдиш стъпката."
      : "Changes are stored locally right away. Click \"Save Attendance\" only to confirm this step.";
  const attendanceEmptyTitle =
    locale === "bg"
      ? "Добави служители, за да маркираш кой е работил днес."
      : "Add employees first so you can mark who has worked today.";
  const attendanceEmptyBody =
    locale === "bg"
      ? "Използвай страницата Служители, за да създадеш реалния списък и после се върни тук за присъствията."
      : "Use the Employees page to build your roster, then come back here to assign shifts.";
  const attendanceEmptyCta = locale === "bg" ? "Отвори Служители" : "Open Employees";

  const roleSections = ROLE_ORDER.map((role) => ({
    role,
    title: role === "kitchen" ? t.common.kitchen : t.common.service,
    badgeClassName:
      role === "kitchen"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    entries: attendanceDrafts.filter((entry) => entry.employee.role === role),
  }));
  const attendanceTileDescription =
    checkedInCount > 0
      ? `${checkedInCount} ${attendanceSummaryLabel} · ${formatShiftUnits(totalPayUnits)} ${shiftsSummaryLabel}`
      : copy.attendance[1];

  function closeDialog() {
    setActiveDialog(null);
  }

  function triggerFinishAttention() {
    if (dataMode === "demo") {
      return;
    }

    setIsFinishAttentionActive(true);

    if (readyTimeoutRef.current) {
      window.clearTimeout(readyTimeoutRef.current);
    }

    readyTimeoutRef.current = window.setTimeout(() => {
      setIsFinishAttentionActive(false);
      readyTimeoutRef.current = null;
    }, 650);
  }

  function completeTask(task: TaskKey) {
    const nextFinanceDone = task === "finance" ? true : isFinanceDone;
    const nextAttendanceDone = task === "attendance" ? true : isAttendanceDone;
    const nextExpensesDone = task === "expenses" ? true : isExpensesDone;
    const willBecomeReady =
      nextFinanceDone && nextAttendanceDone && nextExpensesDone && !allTasksComplete;

    if (task === "finance") setIsFinanceDone(true);
    if (task === "attendance") setIsAttendanceDone(true);
    if (task === "expenses") setIsExpensesDone(true);

    if (willBecomeReady) {
      triggerFinishAttention();
    }

    setActiveDialog(null);
  }

  function updateAttendanceSelection(employeeId: string, selection: 0 | PayUnits) {
    setAttendanceDrafts((current) =>
      current.map((entry) =>
        entry.employee.id === employeeId
          ? {
              ...entry,
              isPresent: selection !== 0,
              payUnits: selection === 0 ? 1 : selection,
            }
          : entry,
      ),
    );
  }

  function addExpenseDraft() {
    setExpenseDrafts((current) => [
      ...current,
      createExpenseDraftItem(expenseCategories[0] ?? null),
    ]);
  }

  function updateExpenseDraft(
    itemId: string,
    updater: (item: ExpenseEditorDraftItem) => ExpenseEditorDraftItem,
  ) {
    setExpenseDrafts((current) =>
      current.map((item) => (item.id === itemId ? updater(item) : item)),
    );
  }

  return (
    <form action={formAction} className="w-full space-y-8">
      <input type="hidden" name="workDate" value={initialReport.workDate} />
      <input type="hidden" name="turnover" value={reportForm.turnover} />
      <input type="hidden" name="profit" value={reportForm.profit} />
      <input type="hidden" name="cardAmount" value={reportForm.cardAmount} />
      <input type="hidden" name="reportNotes" value={reportForm.notes} />
      <input type="hidden" name="manualExpense" value={String(totalExpense)} />
      <input
        type="hidden"
        name="attendancePayload"
        value={JSON.stringify(
          attendanceDrafts.map((entry) => ({
            employeeId: entry.employee.id,
            isPresent: entry.isPresent,
            payUnits: entry.payUnits,
          })),
        )}
      />
      <input
        type="hidden"
        name="expenseItemsPayload"
        value={JSON.stringify(
          expenseDrafts.map((item) => ({
            id: item.id,
            categoryId: item.categoryId,
            amount: toNumber(item.amount),
            amountOriginal: item.amountOriginal ?? toNumber(item.amount),
            currencyOriginal: item.currencyOriginal ?? "EUR",
            description: item.description,
            receiptImagePath: item.receiptImagePath,
            receiptOcrText: item.receiptOcrText,
            sourceType: item.sourceType,
            telegramUserId: item.telegramUserId,
            categoryName: item.categoryName,
            categoryEmoji: item.categoryEmoji,
            createdAt: item.createdAt,
          })),
        )}
      />
      <section className="rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8 lg:p-10">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500" />
                {copy.progress}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {completedCount}/3
              </span>
              {dataMode === "demo" ? (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {t.today.demoDataset}
                </span>
              ) : null}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500 dark:text-slate-400">
                {copy.subtitle}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px]">
            <div className="rounded-3xl bg-slate-50 px-5 py-4 dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {t.nav.today}
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                {formatDateLabel(initialReport.workDate, locale)}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 px-5 py-4 dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                EUR / BGN
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                {formatExchangeRateLabel()}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Dialog
            open={activeDialog === "finance"}
            onOpenChange={(open) => setActiveDialog(open ? "finance" : null)}
            preventClose
          >
            <DialogTrigger asChild>
              <TaskTile
                title={copy.finance[0]}
                description={copy.finance[1]}
                completed={isFinanceDone}
                pendingLabel={copy.pending}
                doneLabel={copy.done}
                icon={Wallet}
                accentClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              />
            </DialogTrigger>

            <DialogContent
              className="overflow-hidden rounded-[1.75rem] p-0 sm:max-w-lg"
              showClose
              onClose={closeDialog}
              onPointerDownOutside={(event) => event.preventDefault()}
              onEscapeKeyDown={(event) => event.preventDefault()}
            >
              <DialogHeader className="border-b border-slate-200/70 p-6 pr-16 dark:border-slate-800">
                <DialogTitle>{copy.finance[2]}</DialogTitle>
                <DialogDescription>{copy.finance[3]}</DialogDescription>
              </DialogHeader>

              <div className="space-y-5 bg-slate-50/50 p-6 dark:bg-slate-950/80">
                <div className="space-y-2">
                  <Label htmlFor="finance-turnover">{t.today.turnoverEur}</Label>
                  <Input
                    id="finance-turnover"
                    inputMode="decimal"
                    value={reportForm.turnover}
                    onChange={(event) =>
                      setReportForm((current) => ({
                        ...current,
                        turnover: event.target.value,
                      }))
                    }
                    className="h-12 rounded-2xl"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.today.bgnView} {formatBgnCurrencyFromEur(toNumber(reportForm.turnover))}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finance-profit">{t.today.profitEur}</Label>
                  <Input
                    id="finance-profit"
                    inputMode="decimal"
                    value={reportForm.profit}
                    onChange={(event) =>
                      setReportForm((current) => ({
                        ...current,
                        profit: event.target.value,
                      }))
                    }
                    className="h-12 rounded-2xl"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.today.bgnView} {formatBgnCurrencyFromEur(toNumber(reportForm.profit))}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finance-card">{t.today.cardAmountEur}</Label>
                  <Input
                    id="finance-card"
                    inputMode="decimal"
                    value={reportForm.cardAmount}
                    onChange={(event) =>
                      setReportForm((current) => ({
                        ...current,
                        cardAmount: event.target.value,
                      }))
                    }
                    className="h-12 rounded-2xl"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.today.bgnView}{" "}
                    {formatBgnCurrencyFromEur(toNumber(reportForm.cardAmount))}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finance-notes">{t.today.managerNotes}</Label>
                  <textarea
                    id="finance-notes"
                    value={reportForm.notes}
                    onChange={(event) =>
                      setReportForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    className="min-h-28 w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-emerald-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder={t.today.notesPlaceholder}
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => completeTask("finance")}
                  className="h-14 w-full rounded-2xl bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700"
                >
                  {copy.finance[4]}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={activeDialog === "attendance"}
            onOpenChange={(open) => setActiveDialog(open ? "attendance" : null)}
            preventClose
          >
            <DialogTrigger asChild>
              <TaskTile
                title={copy.attendance[0]}
                description={attendanceTileDescription}
                completed={isAttendanceDone}
                pendingLabel={copy.pending}
                doneLabel={copy.done}
                icon={Users}
                accentClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              />
            </DialogTrigger>

            <DialogContent
              className="overflow-hidden rounded-[1.75rem] p-0 sm:max-w-3xl"
              showClose
              onClose={closeDialog}
              onPointerDownOutside={(event) => event.preventDefault()}
              onEscapeKeyDown={(event) => event.preventDefault()}
            >
              <DialogHeader className="border-b border-slate-200/70 p-6 pr-16 dark:border-slate-800">
                <DialogTitle>{copy.attendance[2]}</DialogTitle>
                <DialogDescription>{copy.attendance[3]}</DialogDescription>
              </DialogHeader>

              <div className="space-y-5 bg-slate-50/50 p-6 dark:bg-slate-950/80">
                <div className="rounded-3xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                  {attendanceHint}
                </div>

                {attendanceDrafts.length === 0 ? (
                  <div className="rounded-[1.75rem] border border-dashed border-slate-200/70 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
                      <div className="flex size-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        <Users className="size-7" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {attendanceEmptyTitle}
                        </p>
                        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {attendanceEmptyBody}
                        </p>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        className="h-12 rounded-2xl border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                      >
                        <Link href="/employees">{attendanceEmptyCta}</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  roleSections.map((section) => (
                    <div
                      key={section.role}
                      className="rounded-[1.75rem] border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            {section.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {section.entries.filter((entry) => entry.isPresent).length}/
                            {section.entries.length} {attendanceSummaryLabel}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                            section.badgeClassName,
                          )}
                        >
                          {formatShiftUnits(
                            section.entries.reduce(
                              (sum, entry) => sum + (entry.isPresent ? entry.payUnits : 0),
                              0,
                            ),
                          )}{" "}
                          {shiftsSummaryLabel}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {section.entries.length === 0 ? (
                          <p className="rounded-3xl border border-dashed border-slate-200/70 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
                            {t.today.noEmployeesInRole}
                          </p>
                        ) : null}

                        {section.entries.map((entry) => {
                          const selectedUnits = entry.isPresent ? entry.payUnits : 0;

                          return (
                            <div
                              key={entry.employee.id}
                              className={cn(
                                "rounded-[1.5rem] border p-4 transition-all duration-200",
                                selectedUnits === 0
                                  ? "border-slate-200/70 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70"
                                  : "border-emerald-200 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-500/10 dark:border-emerald-800/80 dark:bg-emerald-900/20",
                              )}
                            >
                              <div className="space-y-4">
                                <div>
                                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                                    {entry.employee.fullName}
                                  </p>
                                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                    <span
                                      className={cn(
                                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                        selectedUnits === 0
                                          ? "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300"
                                          : "bg-white text-emerald-700 dark:bg-slate-900 dark:text-emerald-400",
                                      )}
                                    >
                                      {selectedUnits === 0
                                        ? copy.pending
                                        : `${formatShiftUnits(selectedUnits)} ${shiftsSummaryLabel}`}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                  {SHIFT_OPTIONS.map((option) => (
                                    <button
                                      key={`${entry.employee.id}-${option}`}
                                      type="button"
                                      onClick={() =>
                                        updateAttendanceSelection(entry.employee.id, option)
                                      }
                                      className={cn(
                                        "h-12 min-w-14 rounded-2xl border text-sm font-bold transition-all",
                                        selectedUnits === option
                                          ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
                                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:text-emerald-400",
                                      )}
                                    >
                                      {option}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}

                <div className="rounded-3xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  {attendanceLocalDraftNotice}
                </div>

                <Button
                  type="button"
                  onClick={() => completeTask("attendance")}
                  className="h-14 w-full rounded-2xl bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700"
                >
                  {copy.attendance[4]}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Dialog
            open={activeDialog === "expenses"}
            onOpenChange={(open) => setActiveDialog(open ? "expenses" : null)}
            preventClose
          >
            <DialogTrigger asChild>
              <TaskTile
                title={copy.expenses[0]}
                description={copy.expenses[1]}
                completed={isExpensesDone}
                pendingLabel={copy.pending}
                doneLabel={copy.done}
                icon={ReceiptText}
                accentClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              />
            </DialogTrigger>

            <DialogContent
              className="overflow-hidden rounded-[1.75rem] p-0 sm:max-w-3xl"
              showClose
              onClose={closeDialog}
              onPointerDownOutside={(event) => event.preventDefault()}
              onEscapeKeyDown={(event) => event.preventDefault()}
            >
              <DialogHeader className="border-b border-slate-200/70 p-6 pr-16 dark:border-slate-800">
                <DialogTitle>{copy.expenses[2]}</DialogTitle>
                <DialogDescription>{copy.expenses[3]}</DialogDescription>
              </DialogHeader>

              <div className="space-y-5 bg-slate-50/50 p-6 dark:bg-slate-950/80">
                {expenseDrafts.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200/70 bg-white px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    {copy.emptyExpenses}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expenseDrafts.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_auto]">
                          <div className="space-y-2">
                            <Label htmlFor={`expense-category-${item.id}`}>{copy.category}</Label>
                            <SelectField
                              id={`expense-category-${item.id}`}
                              value={item.categoryId ?? ""}
                              className="h-12 rounded-2xl"
                              onChange={(event) => {
                                const nextCategoryId = event.target.value || null;
                                const category =
                                  expenseCategories.find(
                                    (entry) => entry.id === nextCategoryId,
                                  ) ?? null;

                                updateExpenseDraft(item.id, (current) => ({
                                  ...current,
                                  categoryId: nextCategoryId,
                                  categoryName: category?.name ?? null,
                                  categoryEmoji: category?.emoji ?? null,
                                }));
                              }}
                            >
                              <option value="">{copy.uncategorized}</option>
                              {expenseCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.emoji ? `${category.emoji} ` : ""}
                                  {category.name}
                                </option>
                              ))}
                            </SelectField>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`expense-amount-${item.id}`}>{copy.amount}</Label>
                            <Input
                              id={`expense-amount-${item.id}`}
                              inputMode="decimal"
                              value={item.amount}
                              onChange={(event) =>
                                updateExpenseDraft(item.id, (current) => ({
                                  ...current,
                                  amount: event.target.value,
                                }))
                              }
                              className="h-12 rounded-2xl"
                            />
                          </div>

                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                setExpenseDrafts((current) =>
                                  current.filter((entry) => entry.id !== item.id),
                                )
                              }
                              className="h-12 rounded-2xl px-4 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                            >
                              <Trash2 className="size-4" />
                              {copy.remove}
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          <Label htmlFor={`expense-description-${item.id}`}>{copy.note}</Label>
                          <Input
                            id={`expense-description-${item.id}`}
                            value={item.description}
                            placeholder={copy.notePlaceholder}
                            onChange={(event) =>
                              updateExpenseDraft(item.id, (current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            className="h-12 rounded-2xl"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          {item.sourceType === "telegram" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                              <ReceiptText className="size-3" />
                              {copy.telegram}
                            </span>
                          ) : null}
                          {item.receiptImagePath ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                              <ReceiptText className="size-3" />
                              {copy.receipt}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      {copy.totalExpense}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      €{totalExpense.toFixed(2)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {formatBgnCurrencyFromEur(totalExpense)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addExpenseDraft}
                    className="h-12 rounded-2xl border-slate-200/70 px-5 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                  >
                    <Plus className="size-4" />
                    {copy.addExpense}
                  </Button>
                </div>

                <Button
                  type="button"
                  onClick={() => completeTask("expenses")}
                  className="h-14 w-full rounded-2xl bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700"
                >
                  {copy.expenses[4]}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8 lg:p-10">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-950/70">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {copy.finance[2]}
            </p>
            <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              €{toNumber(reportForm.turnover).toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {formatBgnCurrencyFromEur(toNumber(reportForm.turnover))}
            </p>
          </div>

          <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-950/70">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {copy.attendance[2]}
            </p>
            <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {checkedInCount}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {totalPayUnits.toFixed(1)} {t.payroll.shiftsCount.toLowerCase()}
            </p>
          </div>

          <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-950/70">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {copy.expenses[2]}
            </p>
            <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              €{totalExpense.toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {formatBgnCurrencyFromEur(totalExpense)}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {actionState.status !== "idle" ? (
            <div
              className={cn(
                "rounded-3xl border px-5 py-4 text-sm",
                actionState.status === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-400",
              )}
            >
              {actionState.messageKey === "msgSaveSuccess"
                ? copy.saveSuccess
                : actionState.messageKey === "msgSaveError"
                  ? copy.saveError
                  : actionState.message}
            </div>
          ) : null}

          {dataMode === "demo" ? (
            <div className="rounded-3xl border border-slate-200/70 bg-slate-50 px-5 py-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
              {copy.demoNote}
            </div>
          ) : null}

          <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {copy.finishHint}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {copy.progress}: {completedCount}/3
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={!isFinishReady || isPending}
                aria-busy={isPending}
                className={cn(
                  "h-16 w-full rounded-[1.4rem] px-8 text-base font-extrabold transition-all duration-300 lg:w-auto lg:min-w-[320px]",
                  isFinishReady
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
                    : "bg-slate-200 text-slate-500 hover:bg-slate-200",
                  isFinishAttentionActive && "animate-pulse scale-[1.02]",
                )}
              >
                <CheckCircle2 className="size-5" />
                {isPending ? t.common.saving : copy.finish}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}

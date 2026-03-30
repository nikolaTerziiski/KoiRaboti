"use client";

import { Plus, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyDisplay } from "@/components/ui/money-display";
import { SelectField } from "@/components/ui/select-field";
import { calculateExpenseTotal } from "@/lib/expenses";
import type { ExpenseCategory, ExpenseSourceType } from "@/lib/types";

export type ExpenseEditorDraftItem = {
  id: string;
  categoryId: string | null;
  amount: string;
  description: string;
  sourceType: ExpenseSourceType;
  receiptImagePath: string | null;
  receiptOcrText: string | null;
  telegramUserId: string | null;
  amountOriginal: number | null;
  currencyOriginal: string | null;
  categoryName: string | null;
  categoryEmoji: string | null;
  createdAt: string | null;
};

type ExpenseItemsEditorProps = {
  locale: "bg" | "en";
  categories: ExpenseCategory[];
  items: ExpenseEditorDraftItem[];
  onChange: (items: ExpenseEditorDraftItem[]) => void;
  disabled?: boolean;
  title?: string;
  description?: string;
};

function parseDraftAmount(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function createDraftItem(category: ExpenseCategory | null): ExpenseEditorDraftItem {
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

export function ExpenseItemsEditor({
  locale,
  categories,
  items,
  onChange,
  disabled = false,
  title,
  description,
}: ExpenseItemsEditorProps) {
  const labels = {
    title: title ?? (locale === "bg" ? "Разходи по категории" : "Expenses by category"),
    description:
      description ??
      (locale === "bg"
        ? "Добави отделни разходи по деня. Общият разход се изчислява автоматично."
        : "Add itemized expenses for the day. The total expense is derived automatically."),
    category: locale === "bg" ? "Категория" : "Category",
    amount: locale === "bg" ? "Сума (EUR)" : "Amount (EUR)",
    notes: locale === "bg" ? "Бележка" : "Note",
    notesPlaceholder:
      locale === "bg" ? "Кратко описание на разхода" : "Short expense description",
    add: locale === "bg" ? "Добави разход" : "Add expense",
    remove: locale === "bg" ? "Премахни" : "Remove",
    uncategorized: locale === "bg" ? "Без категория" : "Uncategorized",
    total: locale === "bg" ? "Общ разход" : "Total expense",
    empty:
      locale === "bg"
        ? "Още няма добавени разходи за този ден."
        : "No expenses have been added for this day yet.",
    receipt: locale === "bg" ? "Касова бележка" : "Receipt",
    fromTelegram: locale === "bg" ? "От Telegram" : "From Telegram",
  };

  const total = calculateExpenseTotal(
    items.map((item) => ({ amount: parseDraftAmount(item.amount) })),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            {labels.empty}
          </div>
        ) : null}

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="rounded-2xl border border-border bg-muted/50 p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                <div className="space-y-2">
                  <Label htmlFor={`expense-category-${item.id}`}>{labels.category}</Label>
                  <SelectField
                    id={`expense-category-${item.id}`}
                    value={item.categoryId ?? ""}
                    disabled={disabled}
                    onChange={(event) => {
                      const nextCategoryId = event.target.value || null;
                      const category =
                        categories.find((entry) => entry.id === nextCategoryId) ?? null;

                      onChange(
                        items.map((current, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...current,
                                categoryId: nextCategoryId,
                                categoryName: category?.name ?? null,
                                categoryEmoji: category?.emoji ?? null,
                              }
                            : current,
                        ),
                      );
                    }}
                  >
                    <option value="">{labels.uncategorized}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.emoji ? `${category.emoji} ` : ""}
                        {category.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`expense-amount-${item.id}`}>{labels.amount}</Label>
                  <Input
                    id={`expense-amount-${item.id}`}
                    inputMode="decimal"
                    value={item.amount}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(
                        items.map((current, currentIndex) =>
                          currentIndex === index
                            ? { ...current, amount: event.target.value }
                            : current,
                        ),
                      )
                    }
                  />
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <Label htmlFor={`expense-description-${item.id}`}>{labels.notes}</Label>
                <Input
                  id={`expense-description-${item.id}`}
                  value={item.description}
                  disabled={disabled}
                  placeholder={labels.notesPlaceholder}
                  onChange={(event) =>
                    onChange(
                      items.map((current, currentIndex) =>
                        currentIndex === index
                          ? { ...current, description: event.target.value }
                          : current,
                      ),
                    )
                  }
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {item.sourceType === "telegram" ? (
                    <span className="rounded-full bg-card px-2 py-1">{labels.fromTelegram}</span>
                  ) : null}
                  {item.receiptImagePath ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-1">
                      <Receipt className="size-3" />
                      {labels.receipt}
                    </span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => onChange(items.filter((current) => current.id !== item.id))}
                >
                  <Trash2 className="size-4" />
                  {labels.remove}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {labels.total}
            </p>
            <div className="mt-2">
              <MoneyDisplay amount={total} />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange([...items, createDraftItem(categories[0] ?? null)])}
          >
            <Plus className="size-4" />
            {labels.add}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

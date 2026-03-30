import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateExpenseTotal, sanitizeExpenseItems, type ExpenseItemInput } from "@/lib/expenses";

type ExpenseRowInsert = {
  daily_report_id: string;
  category_id: string | null;
  amount: number;
  amount_original: number | null;
  currency_original: string | null;
  description: string | null;
  receipt_image_path: string | null;
  receipt_ocr_text: string | null;
  source_type: "web" | "telegram";
  telegram_user_id: string | null;
};

type ExistingExpenseItemRow = {
  id: string;
};

type InsertedExpenseItemRow = {
  id: string;
  description: string | null;
  receipt_ocr_text: string | null;
};

async function syncExpenseItemContextChunks(
  supabase: SupabaseClient,
  dailyReportId: string,
  previousExpenseItemIds: string[],
  insertedExpenseItems: InsertedExpenseItemRow[],
) {
  try {
    const { data: reportRow, error: reportError } = await supabase
      .from("daily_reports")
      .select("restaurant_id")
      .eq("id", dailyReportId)
      .single();

    if (reportError || !reportRow?.restaurant_id) {
      if (reportError) {
        console.error("[ExpensePersistence] Failed to load report restaurant for AI context:", reportError);
      }
      return;
    }

    if (previousExpenseItemIds.length > 0) {
      const { error: deleteContextError } = await supabase
        .from("telegram_ai_context_chunks")
        .delete()
        .eq("restaurant_id", reportRow.restaurant_id)
        .eq("source_type", "expense_item")
        .in("source_id", previousExpenseItemIds);

      if (deleteContextError) {
        console.error("[ExpensePersistence] Failed to delete old expense AI context:", deleteContextError);
      }
    }

    const contextRows = insertedExpenseItems
      .map((item) => ({
        restaurant_id: reportRow.restaurant_id,
        source_type: "expense_item",
        source_id: item.id,
        chunk_text: [item.description, item.receipt_ocr_text].filter(Boolean).join("\n"),
        freshness_at: new Date().toISOString(),
      }))
      .filter((item) => item.chunk_text.trim().length > 0);

    if (contextRows.length === 0) {
      return;
    }

    const { error: upsertContextError } = await supabase
      .from("telegram_ai_context_chunks")
      .upsert(contextRows, { onConflict: "source_type,source_id" });

    if (upsertContextError) {
      console.error("[ExpensePersistence] Failed to upsert expense AI context:", upsertContextError);
    }
  } catch (error) {
    console.error("[ExpensePersistence] Unexpected AI context sync error:", error);
  }
}

export async function replaceDailyReportExpenseItems(
  supabase: SupabaseClient,
  dailyReportId: string,
  expenseItems: ExpenseItemInput[],
) {
  const sanitizedItems = sanitizeExpenseItems(expenseItems);
  const { data: existingExpenseItems } = await supabase
    .from("daily_expense_items")
    .select("id")
    .eq("daily_report_id", dailyReportId);
  const previousExpenseItemIds = ((existingExpenseItems ?? []) as ExistingExpenseItemRow[]).map(
    (item) => item.id,
  );

  const { error: deleteError } = await supabase
    .from("daily_expense_items")
    .delete()
    .eq("daily_report_id", dailyReportId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (sanitizedItems.length > 0) {
    const rows: ExpenseRowInsert[] = sanitizedItems.map((item) => ({
      daily_report_id: dailyReportId,
      category_id: item.categoryId,
      amount: item.amount,
      amount_original: item.amountOriginal ?? item.amount,
      currency_original: item.currencyOriginal ?? "EUR",
      description: item.description ?? null,
      receipt_image_path: item.receiptImagePath ?? null,
      receipt_ocr_text: item.receiptOcrText ?? null,
      source_type: item.sourceType ?? "web",
      telegram_user_id: item.telegramUserId ?? null,
    }));

    const { data: insertedExpenseItems, error: insertError } = await supabase
      .from("daily_expense_items")
      .insert(rows)
      .select("id, description, receipt_ocr_text");

    if (insertError || !insertedExpenseItems) {
      throw new Error(insertError.message);
    }

    await syncExpenseItemContextChunks(
      supabase,
      dailyReportId,
      previousExpenseItemIds,
      insertedExpenseItems as InsertedExpenseItemRow[],
    );
  } else if (previousExpenseItemIds.length > 0) {
    await syncExpenseItemContextChunks(supabase, dailyReportId, previousExpenseItemIds, []);
  }

  const manualExpense = await syncDailyReportManualExpense(supabase, dailyReportId);

  return {
    items: sanitizedItems,
    manualExpense,
  };
}

export async function syncDailyReportManualExpense(
  supabase: SupabaseClient,
  dailyReportId: string,
) {
  const { data: items, error: itemsError } = await supabase
    .from("daily_expense_items")
    .select("amount")
    .eq("daily_report_id", dailyReportId);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const manualExpense = calculateExpenseTotal(
    (items ?? []).map((item) => ({ amount: Number(item.amount) })),
  );
  const { error: updateError } = await supabase
    .from("daily_reports")
    .update({ manual_expense: manualExpense })
    .eq("id", dailyReportId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return manualExpense;
}

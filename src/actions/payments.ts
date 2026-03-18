"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseCredentials } from "@/lib/env";
import { getUserRestaurantId } from "@/lib/supabase/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PayrollPeriod } from "@/lib/types";

export type PayrollPaymentActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  messageKey: "msgSaveSuccess" | "msgSaveError" | null;
  refreshKey: string | null;
};

function parsePositiveAmount(value: FormDataEntryValue | null, fieldName: string) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a valid positive number.`);
  }

  return parsed;
}

function parseNonNegativeAmount(value: FormDataEntryValue | null, fieldName: string) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a valid number greater than or equal to 0.`);
  }

  return parsed;
}

function parsePayrollMonth(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-01$/.test(normalized)) {
    throw new Error("Payroll month is invalid.");
  }

  return normalized;
}

function parsePayrollPeriod(value: FormDataEntryValue | null): PayrollPeriod {
  const normalized = String(value ?? "").trim();
  if (normalized === "first_half" || normalized === "second_half") {
    return normalized;
  }

  throw new Error("Payroll period is invalid.");
}

function revalidatePayrollViews() {
  revalidatePath("/payroll");
}

export async function addPayrollAdvanceAction(
  _previousState: PayrollPaymentActionState,
  formData: FormData,
): Promise<PayrollPaymentActionState> {
  if (!hasSupabaseCredentials()) {
    return {
      status: "error",
      message: "Supabase is not configured. Payroll advances cannot be saved in demo mode.",
      messageKey: "msgSaveError",
      refreshKey: null,
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "error",
      message: "Supabase client is unavailable for payroll advances.",
      messageKey: "msgSaveError",
      refreshKey: null,
    };
  }

  try {
    if (!(await getUserRestaurantId(supabase))) {
      throw new Error("No restaurant found for current user.");
    }

    const employeeId = String(formData.get("employeeId") ?? "").trim();
    const payrollMonth = parsePayrollMonth(formData.get("payrollMonth"));
    const payrollPeriod = parsePayrollPeriod(formData.get("payrollPeriod"));
    const amount = parsePositiveAmount(formData.get("amount"), "Advance amount");

    if (!employeeId) {
      throw new Error("Employee id is required.");
    }

    const { error } = await supabase.from("payroll_payments").insert({
      employee_id: employeeId,
      amount,
      payment_type: "advance",
      payroll_month: payrollMonth,
      payroll_period: payrollPeriod,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePayrollViews();

    return {
      status: "success",
      message: "Payroll advance saved.",
      messageKey: "msgSaveSuccess",
      refreshKey: crypto.randomUUID(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Payroll advance could not be saved.",
      messageKey: "msgSaveError",
      refreshKey: null,
    };
  }
}

export async function togglePayrollPaymentAction(
  _previousState: PayrollPaymentActionState,
  formData: FormData,
): Promise<PayrollPaymentActionState> {
  if (!hasSupabaseCredentials()) {
    return {
      status: "error",
      message: "Supabase is not configured. Payroll payments cannot be updated in demo mode.",
      messageKey: "msgSaveError",
      refreshKey: null,
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "error",
      message: "Supabase client is unavailable for payroll payments.",
      messageKey: "msgSaveError",
      refreshKey: null,
    };
  }

  try {
    if (!(await getUserRestaurantId(supabase))) {
      throw new Error("No restaurant found for current user.");
    }

    const employeeId = String(formData.get("employeeId") ?? "").trim();
    const payrollMonth = parsePayrollMonth(formData.get("payrollMonth"));
    const payrollPeriod = parsePayrollPeriod(formData.get("payrollPeriod"));
    const amount = parseNonNegativeAmount(formData.get("amount"), "Payroll amount");

    if (!employeeId) {
      throw new Error("Employee id is required.");
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("payroll_payments")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("payroll_month", payrollMonth)
      .eq("payroll_period", payrollPeriod)
      .eq("payment_type", "payroll");

    if (existingError) {
      throw new Error(existingError.message);
    }

    if ((existingRows ?? []).length > 0) {
      const { error: deleteError } = await supabase
        .from("payroll_payments")
        .delete()
        .eq("employee_id", employeeId)
        .eq("payroll_month", payrollMonth)
        .eq("payroll_period", payrollPeriod)
        .eq("payment_type", "payroll");

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      revalidatePayrollViews();

      return {
        status: "success",
        message: "Payroll payment removed.",
        messageKey: "msgSaveSuccess",
        refreshKey: crypto.randomUUID(),
      };
    }

    const { error: insertError } = await supabase.from("payroll_payments").insert({
      employee_id: employeeId,
      amount,
      payment_type: "payroll",
      payroll_month: payrollMonth,
      payroll_period: payrollPeriod,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    revalidatePayrollViews();

    return {
      status: "success",
      message: "Payroll payment saved.",
      messageKey: "msgSaveSuccess",
      refreshKey: crypto.randomUUID(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Payroll payment could not be updated.",
      messageKey: "msgSaveError",
      refreshKey: null,
    };
  }
}

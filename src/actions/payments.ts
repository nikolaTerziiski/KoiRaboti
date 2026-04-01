"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseCredentials } from "@/lib/env";
import { getUserRestaurantId } from "@/lib/supabase/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

function getEmployeeId(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  if (!employeeId) {
    throw new Error("Employee id is required.");
  }

  return employeeId;
}

function revalidatePayrollViews(employeeId: string) {
  revalidatePath("/payroll");
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/profile");
}

function buildErrorState(message: string): PayrollPaymentActionState {
  return {
    status: "error",
    message,
    messageKey: "msgSaveError",
    refreshKey: null,
  };
}

export async function addPayrollAdvanceAction(
  _previousState: PayrollPaymentActionState,
  formData: FormData,
): Promise<PayrollPaymentActionState> {
  if (!hasSupabaseCredentials()) {
    return buildErrorState("Payroll advances cannot be saved in demo mode.");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return buildErrorState("Live data connection is unavailable for payroll advances.");
  }

  try {
    if (!(await getUserRestaurantId(supabase))) {
      throw new Error("No restaurant found for current user.");
    }

    const employeeId = getEmployeeId(formData);
    const amount = parsePositiveAmount(formData.get("amount"), "Advance amount");
    const { error } = await supabase.from("payroll_payments").insert({
      employee_id: employeeId,
      amount,
      payment_type: "advance",
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePayrollViews(employeeId);

    return {
      status: "success",
      message: "Payroll advance saved.",
      messageKey: "msgSaveSuccess",
      refreshKey: crypto.randomUUID(),
    };
  } catch (error) {
    return buildErrorState(
      error instanceof Error ? error.message : "Payroll advance could not be saved.",
    );
  }
}

export async function togglePayrollPaymentAction(
  _previousState: PayrollPaymentActionState,
  formData: FormData,
): Promise<PayrollPaymentActionState> {
  if (!hasSupabaseCredentials()) {
    return buildErrorState("Payroll payments cannot be updated in demo mode.");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return buildErrorState("Live data connection is unavailable for payroll payments.");
  }

  try {
    if (!(await getUserRestaurantId(supabase))) {
      throw new Error("No restaurant found for current user.");
    }

    const employeeId = getEmployeeId(formData);
    const intent = String(formData.get("intent") ?? "pay").trim() === "undo"
      ? "undo"
      : "pay";

    if (intent === "undo") {
      const { data: latestPayment, error: latestPaymentError } = await supabase
        .from("payroll_payments")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("payment_type", "payroll")
        .order("paid_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestPaymentError) {
        throw new Error(latestPaymentError.message);
      }

      if (!latestPayment) {
        throw new Error("No payroll payment was found to undo.");
      }

      const { error: deleteError } = await supabase
        .from("payroll_payments")
        .delete()
        .eq("id", latestPayment.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
    } else {
      const amount = parsePositiveAmount(formData.get("amount"), "Payroll amount");
      const { error: insertError } = await supabase.from("payroll_payments").insert({
        employee_id: employeeId,
        amount,
        payment_type: "payroll",
      });

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    revalidatePayrollViews(employeeId);

    return {
      status: "success",
      message: intent === "undo" ? "Payroll payment removed." : "Payroll payment saved.",
      messageKey: "msgSaveSuccess",
      refreshKey: crypto.randomUUID(),
    };
  } catch (error) {
    return buildErrorState(
      error instanceof Error ? error.message : "Payroll payment could not be updated.",
    );
  }
}

export const recordPayrollSettlementAction = togglePayrollPaymentAction;

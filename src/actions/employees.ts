"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseCredentials } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type EmployeeActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  refreshKey: string | null;
};

export const initialEmployeeActionState: EmployeeActionState = {
  status: "idle",
  message: null,
  refreshKey: null,
};

function normalizeText(value: FormDataEntryValue | null, fieldName: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function parseDailyRate(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Daily rate must be a valid positive number.");
  }

  return parsed;
}

function revalidateEmployeeViews() {
  revalidatePath("/employees");
  revalidatePath("/today");
  revalidatePath("/payroll");
}

function buildUnavailableState(message: string): EmployeeActionState {
  return {
    status: "error",
    message,
    refreshKey: null,
  };
}

export async function createEmployeeAction(
  _previousState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  if (!hasSupabaseCredentials()) {
    return buildUnavailableState(
      "Supabase is not configured. Employees cannot be saved in demo mode.",
    );
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return buildUnavailableState("Supabase client is unavailable for employee creation.");
  }

  try {
    const fullName = normalizeText(formData.get("fullName"), "Full name");
    const role = normalizeText(formData.get("role"), "Role");
    const dailyRate = parseDailyRate(formData.get("dailyRate"));

    const { error } = await supabase.from("employees").insert({
      full_name: fullName,
      role,
      daily_rate: dailyRate,
      is_active: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidateEmployeeViews();

    return {
      status: "success",
      message: "Employee created successfully.",
      refreshKey: crypto.randomUUID(),
    };
  } catch (error) {
    return buildUnavailableState(
      error instanceof Error ? error.message : "Employee could not be created.",
    );
  }
}

export async function updateEmployeeAction(
  _previousState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  if (!hasSupabaseCredentials()) {
    return buildUnavailableState(
      "Supabase is not configured. Employees cannot be saved in demo mode.",
    );
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return buildUnavailableState("Supabase client is unavailable for employee updates.");
  }

  try {
    const employeeId = normalizeText(formData.get("employeeId"), "Employee id");
    const fullName = normalizeText(formData.get("fullName"), "Full name");
    const role = normalizeText(formData.get("role"), "Role");
    const dailyRate = parseDailyRate(formData.get("dailyRate"));

    const { error } = await supabase
      .from("employees")
      .update({
        full_name: fullName,
        role,
        daily_rate: dailyRate,
      })
      .eq("id", employeeId);

    if (error) {
      throw new Error(error.message);
    }

    revalidateEmployeeViews();

    return {
      status: "success",
      message: "Employee updated successfully.",
      refreshKey: crypto.randomUUID(),
    };
  } catch (error) {
    return buildUnavailableState(
      error instanceof Error ? error.message : "Employee could not be updated.",
    );
  }
}

export async function setEmployeeActiveAction(
  _previousState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  if (!hasSupabaseCredentials()) {
    return buildUnavailableState(
      "Supabase is not configured. Employees cannot be updated in demo mode.",
    );
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return buildUnavailableState("Supabase client is unavailable for employee status updates.");
  }

  try {
    const employeeId = normalizeText(formData.get("employeeId"), "Employee id");
    const nextIsActive = String(formData.get("nextIsActive") ?? "") === "true";

    const { error } = await supabase
      .from("employees")
      .update({
        is_active: nextIsActive,
      })
      .eq("id", employeeId);

    if (error) {
      throw new Error(error.message);
    }

    revalidateEmployeeViews();

    return {
      status: "success",
      message: nextIsActive ? "Employee reactivated." : "Employee deactivated.",
      refreshKey: crypto.randomUUID(),
    };
  } catch (error) {
    return buildUnavailableState(
      error instanceof Error ? error.message : "Employee status could not be updated.",
    );
  }
}

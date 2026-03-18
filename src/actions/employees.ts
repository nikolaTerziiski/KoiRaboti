"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseCredentials } from "@/lib/env";
import { getUserRestaurantId } from "@/lib/supabase/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type EmployeeActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  messageKey:
    | "msgCreateSuccess"
    | "msgUpdateSuccess"
    | "msgDeactivated"
    | "msgReactivated"
    | "msgSaveError"
    | "msgDuplicatePhone"
    | null;
  refreshKey: string | null;
};

function requireText(value: FormDataEntryValue | null, fieldName: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function parseDailyRate(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Daily rate must be a valid positive number.");
  }

  return parsed;
}

function splitFullName(fullName: string) {
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ");

  return {
    firstName,
    lastName,
  };
}

function revalidateEmployeeViews() {
  revalidatePath("/employees");
  revalidatePath("/today");
  revalidatePath("/payroll");
}

function buildUnavailableState(
  message: string,
  messageKey: EmployeeActionState["messageKey"] = "msgSaveError",
): EmployeeActionState {
  return { status: "error", message, messageKey, refreshKey: null };
}

function isDuplicatePhoneError(code: string | undefined) {
  return code === "23505";
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
    const restaurantId = await getUserRestaurantId(supabase);
    if (!restaurantId) {
      throw new Error("No restaurant found for current user.");
    }

    const fullName = requireText(formData.get("fullName"), "Full name");
    const phoneNumber = normalizeOptionalText(formData.get("phoneNumber"));
    const dailyRate = parseDailyRate(formData.get("dailyRate"));
    const { firstName, lastName } = splitFullName(fullName);

    const { error } = await supabase.from("employees").insert({
      restaurant_id: restaurantId,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      daily_rate: dailyRate,
      is_active: true,
    });

    if (error) {
      if (isDuplicatePhoneError(error.code)) {
        return {
          status: "error",
          message: "This phone number is already registered for your restaurant.",
          messageKey: "msgDuplicatePhone",
          refreshKey: null,
        };
      }

      throw new Error(error.message);
    }

    revalidateEmployeeViews();

    return {
      status: "success",
      message: "Employee added to roster.",
      messageKey: "msgCreateSuccess",
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
    const restaurantId = await getUserRestaurantId(supabase);
    if (!restaurantId) {
      throw new Error("No restaurant found for current user.");
    }

    const employeeId = requireText(formData.get("employeeId"), "Employee id");
    const fullName = requireText(formData.get("fullName"), "Full name");
    const phoneNumber = normalizeOptionalText(formData.get("phoneNumber"));
    const dailyRate = parseDailyRate(formData.get("dailyRate"));
    const { firstName, lastName } = splitFullName(fullName);

    const { error } = await supabase
      .from("employees")
      .update({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        daily_rate: dailyRate,
      })
      .eq("id", employeeId)
      .eq("restaurant_id", restaurantId);

    if (error) {
      if (isDuplicatePhoneError(error.code)) {
        return {
          status: "error",
          message: "This phone number is already registered for your restaurant.",
          messageKey: "msgDuplicatePhone",
          refreshKey: null,
        };
      }

      throw new Error(error.message);
    }

    revalidateEmployeeViews();

    return {
      status: "success",
      message: "Employee updated.",
      messageKey: "msgUpdateSuccess",
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
    return buildUnavailableState(
      "Supabase client is unavailable for employee status updates.",
    );
  }

  try {
    const restaurantId = await getUserRestaurantId(supabase);
    if (!restaurantId) {
      throw new Error("No restaurant found for current user.");
    }

    const employeeId = requireText(formData.get("employeeId"), "Employee id");
    const nextIsActive = String(formData.get("nextIsActive") ?? "") === "true";

    const { error } = await supabase
      .from("employees")
      .update({ is_active: nextIsActive })
      .eq("id", employeeId)
      .eq("restaurant_id", restaurantId);

    if (error) {
      throw new Error(error.message);
    }

    revalidateEmployeeViews();

    return {
      status: "success",
      message: nextIsActive ? "Employee reactivated." : "Employee deactivated.",
      messageKey: nextIsActive ? "msgReactivated" : "msgDeactivated",
      refreshKey: crypto.randomUUID(),
    };
  } catch (error) {
    return buildUnavailableState(
      error instanceof Error ? error.message : "Employee status could not be updated.",
    );
  }
}

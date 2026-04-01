"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseCredentials } from "@/lib/env";
import { parseRestaurantPayrollSettings } from "@/lib/payroll-settings";
import { getUserRestaurantId } from "@/lib/supabase/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileSettingsActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  refreshKey: string | null;
};

function buildState(
  status: ProfileSettingsActionState["status"],
  message: string | null,
  refreshKey: string | null = null,
): ProfileSettingsActionState {
  return { status, message, refreshKey };
}

export async function updateRestaurantSettingsAction(
  _previousState: ProfileSettingsActionState,
  formData: FormData,
): Promise<ProfileSettingsActionState> {
  if (!hasSupabaseCredentials()) {
    return buildState("error", "Business settings cannot be saved in demo mode.");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return buildState("error", "Live data connection is unavailable for profile settings.");
  }

  try {
    const restaurantId = await getUserRestaurantId(supabase);
    if (!restaurantId) {
      throw new Error("No restaurant found for the current user.");
    }

    const restaurantName = String(formData.get("restaurantName") ?? "").trim();
    if (!restaurantName) {
      throw new Error("Restaurant name is required.");
    }

    const payrollSettings = parseRestaurantPayrollSettings({
      cadence: String(formData.get("defaultPayrollCadence") ?? "").trim(),
      weeklyPayday: formData.get("defaultWeeklyPayday"),
      monthlyPayDay: formData.get("defaultMonthlyPayDay"),
      twiceMonthlyDay1: formData.get("defaultTwiceMonthlyDay1"),
      twiceMonthlyDay2: formData.get("defaultTwiceMonthlyDay2"),
    });

    const { error } = await supabase
      .from("restaurants")
      .update({
        name: restaurantName,
        default_payroll_cadence: payrollSettings.defaultPayrollCadence,
        default_weekly_payday: payrollSettings.defaultWeeklyPayday,
        default_monthly_pay_day: payrollSettings.defaultMonthlyPayDay,
        default_twice_monthly_day_1: payrollSettings.defaultTwiceMonthlyDay1,
        default_twice_monthly_day_2: payrollSettings.defaultTwiceMonthlyDay2,
      })
      .eq("id", restaurantId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/profile");
    revalidatePath("/employees");
    revalidatePath("/payroll");
    revalidatePath("/today");
    revalidatePath("/reports");

    return buildState("success", "Business settings saved.", crypto.randomUUID());
  } catch (error) {
    return buildState(
      "error",
      error instanceof Error ? error.message : "Business settings could not be saved.",
    );
  }
}

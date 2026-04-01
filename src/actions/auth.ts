"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEFAULT_DAILY_EXPENSE_EUR, DEMO_SESSION_COOKIE } from "@/lib/constants";
import { hasSupabaseCredentials } from "@/lib/env";
import { parseRestaurantPayrollSettings } from "@/lib/payroll-settings";
import type { SessionMode } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error: string | null;
};

export type RegisterActionState = {
  status: "idle" | "success" | "error";
  messageKey: "msgSuccess" | "msgError" | "passwordMismatch" | null;
  message: string | null;
};

export type OnboardingActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export async function getSessionMode(): Promise<SessionMode> {
  const cookieStore = await cookies();

  if (cookieStore.get(DEMO_SESSION_COOKIE)?.value === "active") {
    return "demo";
  }

  if (!hasSupabaseCredentials()) {
    return "guest";
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return "guest";
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? "supabase" : "guest";
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return {
      error: "Enter both email and password to continue.",
    };
  }

  if (!hasSupabaseCredentials()) {
    const cookieStore = await cookies();
    cookieStore.set(DEMO_SESSION_COOKIE, "active", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    redirect("/today");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      error: "Live sign-in is not available yet. Use demo mode or configure the app.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  redirect("/today");
}

export async function registerAction(
  _previousState: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return {
      status: "error",
      messageKey: "msgError",
      message: "All fields are required.",
    };
  }

  if (password.length < 6) {
    return {
      status: "error",
      messageKey: "msgError",
      message: "Password must be at least 6 characters.",
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "error",
      messageKey: "msgError",
      message: "Live data connection is unavailable.",
    };
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    return {
      status: "error",
      messageKey: "msgError",
      message: signUpError.message,
    };
  }

  // After signup, user is auto-logged in by Supabase.
  // Redirect to onboarding to collect business details.
  redirect("/onboarding");
}

export async function onboardingAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();

  if (!fullName || !businessName) {
    return {
      status: "error",
      message: "All fields are required.",
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "error",
      message: "Connection unavailable.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "Not authenticated.",
    };
  }

  let payrollSettings;

  try {
    payrollSettings = parseRestaurantPayrollSettings({
      cadence: String(formData.get("defaultPayrollCadence") ?? "").trim(),
      weeklyPayday: formData.get("defaultWeeklyPayday"),
      monthlyPayDay: formData.get("defaultMonthlyPayDay"),
      twiceMonthlyDay1: formData.get("defaultTwiceMonthlyDay1"),
      twiceMonthlyDay2: formData.get("defaultTwiceMonthlyDay2"),
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Payroll settings are invalid.",
    };
  }

  const { error: rpcError } = await supabase.rpc("register_restaurant", {
    p_user_id: user.id,
    p_user_email: user.email ?? "",
    p_restaurant_name: businessName,
    p_admin_full_name: fullName,
    p_default_daily_expense: DEFAULT_DAILY_EXPENSE_EUR,
    p_default_payroll_cadence: payrollSettings.defaultPayrollCadence,
    p_default_weekly_payday: payrollSettings.defaultWeeklyPayday,
    p_default_monthly_pay_day: payrollSettings.defaultMonthlyPayDay,
    p_default_twice_monthly_day_1: payrollSettings.defaultTwiceMonthlyDay1,
    p_default_twice_monthly_day_2: payrollSettings.defaultTwiceMonthlyDay2,
  });

  if (rpcError) {
    return {
      status: "error",
      message: rpcError.message,
    };
  }

  redirect("/today");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);

  if (hasSupabaseCredentials()) {
    const supabase = await getSupabaseServerClient();
    await supabase?.auth.signOut();
  }

  redirect("/login");
}

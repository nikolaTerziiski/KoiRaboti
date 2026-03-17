"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_SESSION_COOKIE } from "@/lib/constants";
import { hasSupabaseCredentials } from "@/lib/env";
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
      error: "Supabase is not configured yet. Add your keys or use demo mode.",
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
  const restaurantName = String(formData.get("restaurantName") ?? "").trim();
  const adminFullName = String(formData.get("adminFullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();
  const defaultExpenseRaw = String(formData.get("defaultDailyExpense") ?? "").trim();

  if (password !== confirmPassword) {
    return {
      status: "error",
      messageKey: "passwordMismatch",
      message: "Passwords do not match.",
    };
  }

  const defaultDailyExpense = Number(defaultExpenseRaw);
  if (!restaurantName || !adminFullName || !email || !password) {
    return {
      status: "error",
      messageKey: "msgError",
      message: "All fields are required.",
    };
  }

  if (!Number.isFinite(defaultDailyExpense) || defaultDailyExpense < 0) {
    return {
      status: "error",
      messageKey: "msgError",
      message: "Default daily expense must be a valid positive number.",
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "error",
      messageKey: "msgError",
      message: "Supabase client is unavailable.",
    };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError || !signUpData.user) {
    return {
      status: "error",
      messageKey: "msgError",
      message: signUpError?.message ?? "Sign-up failed.",
    };
  }

  const { error: rpcError } = await supabase.rpc("register_restaurant", {
    p_user_id: signUpData.user.id,
    p_user_email: signUpData.user.email ?? email,
    p_restaurant_name: restaurantName,
    p_admin_full_name: adminFullName,
    p_default_daily_expense: defaultDailyExpense,
  });

  if (rpcError) {
    return {
      status: "error",
      messageKey: "msgError",
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

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

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);

  if (hasSupabaseCredentials()) {
    const supabase = await getSupabaseServerClient();
    await supabase?.auth.signOut();
  }

  redirect("/login");
}

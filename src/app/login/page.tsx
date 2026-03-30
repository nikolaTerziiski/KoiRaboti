import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionMode, loginAction } from "@/actions/auth";
import { LoginContent } from "@/components/auth/login-content";
import { hasSupabaseCredentials } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Login — KoiRaboti" };

export default async function LoginPage() {
  const sessionMode = await getSessionMode();
  if (sessionMode !== "guest") {
    redirect("/today");
  }

  const usesSupabase = hasSupabaseCredentials();

  return <LoginContent action={loginAction} usesSupabase={usesSupabase} />;
}

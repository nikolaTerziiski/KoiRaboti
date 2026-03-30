import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { hasSupabaseCredentials } from "@/lib/env";
import { RegisterContent } from "@/components/auth/register-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Register — KoiRaboti" };

export default async function RegisterPage() {
  const sessionMode = await getSessionMode();
  if (sessionMode !== "guest") {
    redirect("/today");
  }

  const hasSupabase = hasSupabaseCredentials();

  return <RegisterContent hasSupabase={hasSupabase} />;
}

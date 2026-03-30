import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { hasSupabaseCredentials } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingContent } from "@/components/auth/onboarding-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Onboarding — KoiRaboti" };

export default async function OnboardingPage() {
  const sessionMode = await getSessionMode();

  // Not logged in → go to login
  if (sessionMode === "guest") {
    redirect("/login");
  }

  // Demo mode doesn't need onboarding
  if (sessionMode === "demo") {
    redirect("/today");
  }

  // Check if user already has a profile (= already onboarded)
  if (hasSupabaseCredentials()) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        // Already onboarded → go to dashboard
        if (profile) {
          redirect("/today");
        }
      }
    }
  }

  return <OnboardingContent />;
}

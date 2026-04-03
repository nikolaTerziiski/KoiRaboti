import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { HomePage } from "@/components/landing/home-page";
import { hasSupabaseCredentials } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sessionMode = await getSessionMode();

  if (sessionMode === "guest") {
    return <HomePage />;
  }

  // For Supabase users: check if onboarding is complete (profile exists)
  if (sessionMode === "supabase" && hasSupabaseCredentials()) {
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
        if (!profile) {
          redirect("/onboarding");
        }
      }
    }
  }

  redirect("/today");
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorCard } from "@/components/ui/error-card";
import { ProfilePageClient } from "@/components/profile/profile-page-client";
import { getRestaurantSnapshot } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profile — KoiRaboti" };

export default async function ProfilePage() {
  const [sessionMode, snapshot] = await Promise.all([
    getSessionMode(),
    getRestaurantSnapshot(),
  ]);

  if (sessionMode === "guest") {
    redirect("/login");
  }

  const dataMode = snapshot.errorMessage
    ? "error"
    : snapshot.mode === "supabase"
      ? "supabase"
      : "demo";

  return (
    <AppShell
      pageKey="profile"
      sessionMode={sessionMode === "supabase" ? "supabase" : "demo"}
      dataMode={dataMode}
    >
      {snapshot.errorMessage ? (
        <ErrorCard pageKey="profile" message={snapshot.errorMessage} />
      ) : (
        <ProfilePageClient
          reports={snapshot.reports}
          profile={snapshot.profile}
          restaurant={snapshot.restaurant}
          dataMode={snapshot.mode}
        />
      )}
    </AppShell>
  );
}

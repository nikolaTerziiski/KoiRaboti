import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorCard } from "@/components/ui/error-card";
import { ProfilePageClient } from "@/components/profile/profile-page-client";
import { env, hasTelegramBotCredentials } from "@/lib/env";
import { getRestaurantSnapshot } from "@/lib/supabase/data";
import { getOrCreateTelegramConnectToken } from "@/lib/telegram/data";
import { buildTelegramBotLink, normalizeTelegramBotUsername } from "@/lib/telegram/links";

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

  const telegramBotUsername = normalizeTelegramBotUsername(env.telegramBotUsername);
  let telegramConnectUrl: string | null = telegramBotUsername
    ? buildTelegramBotLink(telegramBotUsername)
    : null;
  const telegramConfigState = telegramBotUsername
    ? "connectable"
    : hasTelegramBotCredentials()
      ? "missing_public_username"
      : "not_configured";

  if (
    snapshot.mode === "supabase" &&
    snapshot.restaurant &&
    telegramBotUsername &&
    hasTelegramBotCredentials()
  ) {
    try {
      const token = await getOrCreateTelegramConnectToken(snapshot.restaurant.id);

      telegramConnectUrl = buildTelegramBotLink(telegramBotUsername, token.token);
    } catch (error) {
      console.error("[ProfilePage] Telegram connect data failed:", error);
    }
  }

  return (
    <AppShell
      pageKey="profile"
      sessionMode={sessionMode === "supabase" ? "supabase" : "demo"}
      dataMode={dataMode}
      hidePageHeader
    >
      {snapshot.errorMessage ? (
        <ErrorCard pageKey="profile" message={snapshot.errorMessage} />
      ) : (
        <ProfilePageClient
          profile={snapshot.profile}
          restaurant={snapshot.restaurant}
          dataMode={snapshot.mode}
          telegramConnectUrl={telegramConnectUrl}
          telegramConfigState={telegramConfigState}
        />
      )}
    </AppShell>
  );
}

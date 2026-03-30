import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorCard } from "@/components/ui/error-card";
import { ProfilePageClient } from "@/components/profile/profile-page-client";
import { env, hasTelegramBotCredentials } from "@/lib/env";
import { getRestaurantSnapshot } from "@/lib/supabase/data";
import { getOrCreateTelegramConnectToken, getTelegramLinkStatus } from "@/lib/telegram/data";

export const dynamic = "force-dynamic";

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

  let telegramConnectUrl: string | null = env.telegramBotUsername
    ? `https://t.me/${env.telegramBotUsername}`
    : null;
  let telegramLinkedUsersCount = 0;

  if (
    snapshot.mode === "supabase" &&
    snapshot.restaurant &&
    env.telegramBotUsername &&
    hasTelegramBotCredentials()
  ) {
    try {
      const [token, linkStatus] = await Promise.all([
        getOrCreateTelegramConnectToken(snapshot.restaurant.id),
        getTelegramLinkStatus(snapshot.restaurant.id),
      ]);

      telegramConnectUrl = `https://t.me/${env.telegramBotUsername}?start=${token.token}`;
      telegramLinkedUsersCount = linkStatus.linkedUsersCount;
    } catch (error) {
      console.error("[ProfilePage] Telegram connect data failed:", error);
    }
  }

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
          telegramConnectUrl={telegramConnectUrl}
          telegramLinkedUsersCount={telegramLinkedUsersCount}
        />
      )}
    </AppShell>
  );
}

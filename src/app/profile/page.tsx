import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionMode } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorCard } from "@/components/ui/error-card";
import { ProfilePageClient } from "@/components/profile/profile-page-client";
import { env, hasTelegramBotCredentials } from "@/lib/env";
import { getRestaurantSnapshot } from "@/lib/supabase/data";
import { getOrCreateTelegramConnectToken, getTelegramLinkStatus } from "@/lib/telegram/data";
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
  let telegramLinkedUsersCount = 0;
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
      const [token, linkStatus] = await Promise.all([
        getOrCreateTelegramConnectToken(snapshot.restaurant.id),
        getTelegramLinkStatus(snapshot.restaurant.id),
      ]);

      telegramConnectUrl = buildTelegramBotLink(telegramBotUsername, token.token);
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
      hidePageHeader
      contentClassName="max-w-6xl px-0 sm:max-w-6xl sm:px-0"
    >
      {snapshot.errorMessage ? (
        <ErrorCard pageKey="profile" message={snapshot.errorMessage} />
      ) : (
        <ProfilePageClient
          reports={snapshot.reports}
          employees={snapshot.employees}
          profile={snapshot.profile}
          restaurant={snapshot.restaurant}
          dataMode={snapshot.mode}
          telegramConnectUrl={telegramConnectUrl}
          telegramLinkedUsersCount={telegramLinkedUsersCount}
          telegramConfigState={telegramConfigState}
          employeeCount={snapshot.employees.length}
        />
      )}
    </AppShell>
  );
}

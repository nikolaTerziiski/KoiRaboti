import { NextRequest, NextResponse } from "next/server";
import { env, hasTelegramSummaryCredentials } from "@/lib/env";
import { formatCurrencyPair } from "@/lib/format";
import { sendMessage } from "@/lib/telegram/api";
import {
  getOpenActions,
  getRestaurantInfo,
  getTodaySnapshot,
  getUsersDueForDailySummary,
  markDailySummarySent,
} from "@/lib/telegram/data";

export const maxDuration = 60;

function getLocalDate(value: Date, timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(value);
    const year = parts.find((part) => part.type === "year")?.value ?? "1970";
    const month = parts.find((part) => part.type === "month")?.value ?? "01";
    const day = parts.find((part) => part.type === "day")?.value ?? "01";
    return `${year}-${month}-${day}`;
  } catch {
    return value.toISOString().slice(0, 10);
  }
}

function buildAppLink(path: string) {
  if (!env.appUrl) {
    return "";
  }

  return `\n<a href="${env.appUrl.replace(/\/$/, "")}${path}">Отвори в приложението</a>`;
}

export async function GET(request: NextRequest) {
  if (!hasTelegramSummaryCredentials()) {
    return NextResponse.json({ error: "Telegram daily summary is not configured" }, { status: 503 });
  }

  const secret =
    request.nextUrl.searchParams.get("secret") ?? request.headers.get("x-cron-secret");

  if (secret !== env.telegramDailySummarySecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const users = await getUsersDueForDailySummary(now);
  let sent = 0;
  const errors: string[] = [];

  for (const user of users) {
    if (!user.restaurantId || !user.chatId) {
      continue;
    }

    const workDate = getLocalDate(now, user.summaryTimezone);

    try {
      const [restaurant, snapshot, openActions] = await Promise.all([
        getRestaurantInfo(user.restaurantId),
        getTodaySnapshot(user.restaurantId),
        getOpenActions(user.restaurantId),
      ]);

      const message = snapshot.report
        ? [
            `<b>Дневно обобщение за ${restaurant.name}</b>`,
            `Дата: ${workDate}`,
            `Оборот: ${formatCurrencyPair(snapshot.report.turnover)}`,
            `Печалба: ${formatCurrencyPair(snapshot.report.profit)}`,
            `Карта: ${formatCurrencyPair(snapshot.report.cardAmount)}`,
            `Разходи: ${formatCurrencyPair(snapshot.report.manualExpense)}`,
            `Присъствие: ${snapshot.report.attendanceEntries.length} записа`,
            openActions.length > 0 ? "" : null,
            ...openActions.map((action) => `• ${action}`),
            buildAppLink("/today"),
          ]
            .filter(Boolean)
            .join("\n")
        : [
            `<b>Дневно обобщение за ${restaurant.name}</b>`,
            `Дата: ${workDate}`,
            "Все още няма записан дневен отчет за днес.",
            buildAppLink("/today"),
          ]
            .filter(Boolean)
            .join("\n");

      await sendMessage(user.chatId, message);
      await markDailySummarySent(user.id, workDate);
      sent += 1;
    } catch (error) {
      console.error("[Telegram Daily Summary] Error:", error);
      errors.push(
        `${user.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    checkedAt: now.toISOString(),
    dueUsers: users.length,
    sent,
    errors,
  });
}

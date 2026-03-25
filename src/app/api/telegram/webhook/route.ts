import { NextRequest, NextResponse } from "next/server";
import { env, hasTelegramBotCredentials } from "@/lib/env";
import { handleTelegramMessage } from "@/lib/telegram/handler";
import type { TelegramUpdate } from "@/lib/telegram/types";

export async function POST(request: NextRequest) {
  // 1. Check bot is configured
  if (!hasTelegramBotCredentials()) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 503 });
  }

  // 2. Verify Telegram webhook secret
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== env.telegramWebhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Parse update
  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 4. Only handle private messages (ignore groups, channels, edited messages)
  if (!update.message || update.message.chat.type !== "private") {
    return NextResponse.json({ ok: true });
  }

  // 5. Process the message (errors are caught inside handleTelegramMessage)
  try {
    await handleTelegramMessage(update.message);
  } catch (error) {
    console.error("[Telegram Webhook] Unhandled error:", error);
  }

  // 6. Always return 200 to Telegram (prevents retries)
  return NextResponse.json({ ok: true });
}

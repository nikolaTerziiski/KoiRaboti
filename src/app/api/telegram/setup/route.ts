import { NextRequest, NextResponse } from "next/server";
import { setWebhook } from "@/lib/telegram/api";
import { env, hasTelegramBotCredentials } from "@/lib/env";

/**
 * One-time webhook registration endpoint.
 * GET /api/telegram/setup?secret=<TELEGRAM_WEBHOOK_SECRET>
 *
 * Automatically detects the app URL from the request.
 * Protected by TELEGRAM_WEBHOOK_SECRET — no hardcoded passwords.
 */
export async function GET(request: NextRequest) {
  if (!hasTelegramBotCredentials()) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 503 });
  }

  // Auth: require the webhook secret as query param
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== env.telegramWebhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Auto-detect the webhook URL from the incoming request
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "https";
  const webhookUrl = `${protocol}://${host}/api/telegram/webhook`;

  const result = await setWebhook(webhookUrl, env.telegramWebhookSecret);

  return NextResponse.json({ webhookUrl, ...result });
}

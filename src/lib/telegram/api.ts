import { env } from "@/lib/env";

const TELEGRAM_API_TIMEOUT_MS = 15_000;

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${env.telegramBotToken}/${method}`;
}

async function telegramFetch(
  method: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const response = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TELEGRAM_API_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Telegram API ${method} failed (${response.status}): ${text}`);
  }

  return response;
}

/** Send a text message to a Telegram chat. */
export async function sendMessage(
  chatId: number,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML",
): Promise<void> {
  await telegramFetch("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
  });
}

/** Show "typing..." indicator while processing. */
export async function sendTypingAction(chatId: number): Promise<void> {
  try {
    await telegramFetch("sendChatAction", { chat_id: chatId, action: "typing" });
  } catch {
    // Non-critical — swallow typing indicator failures
  }
}

/** Get a download URL for a Telegram file by its file_id. */
export async function getFileUrl(fileId: string): Promise<string | null> {
  try {
    const response = await telegramFetch("getFile", { file_id: fileId });
    const data = await response.json();
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${env.telegramBotToken}/${data.result.file_path}`;
    }
    return null;
  } catch {
    return null;
  }
}

/** Register the webhook URL with Telegram. One-time setup. */
export async function setWebhook(
  url: string,
  secret: string,
): Promise<{ ok: boolean; description?: string }> {
  const response = await telegramFetch("setWebhook", {
    url,
    secret_token: secret,
  });
  return response.json();
}

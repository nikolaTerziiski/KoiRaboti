import { env } from "@/lib/env";

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${env.telegramBotToken}/${method}`;
}

/** Send a text message to a Telegram chat. */
export async function sendMessage(
  chatId: number,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML",
): Promise<void> {
  await fetch(apiUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  });
}

/** Show "typing..." indicator while processing. */
export async function sendTypingAction(chatId: number): Promise<void> {
  await fetch(apiUrl("sendChatAction"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

/** Get a download URL for a Telegram file by its file_id. */
export async function getFileUrl(fileId: string): Promise<string | null> {
  const response = await fetch(apiUrl("getFile"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const data = await response.json();
  if (data.ok && data.result?.file_path) {
    return `https://api.telegram.org/file/bot${env.telegramBotToken}/${data.result.file_path}`;
  }
  return null;
}

/** Register the webhook URL with Telegram. One-time setup. */
export async function setWebhook(
  url: string,
  secret: string,
): Promise<{ ok: boolean; description?: string }> {
  const response = await fetch(apiUrl("setWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, secret_token: secret }),
  });
  return response.json();
}

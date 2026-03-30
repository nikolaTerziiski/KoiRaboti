const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me", "www.t.me", "www.telegram.me"]);

export function normalizeTelegramBotUsername(value: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  let candidate = trimmedValue;

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const parsedUrl = new URL(candidate);
      if (!TELEGRAM_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
        return null;
      }

      candidate = parsedUrl.pathname;
    } catch {
      return null;
    }
  } else if (/^(?:www\.)?(?:t\.me|telegram\.me)\//i.test(candidate)) {
    try {
      const parsedUrl = new URL(`https://${candidate}`);
      candidate = parsedUrl.pathname;
    } catch {
      return null;
    }
  }

  const username = candidate
    .replace(/^\/+/, "")
    .replace(/^@/, "")
    .split(/[/?#]/, 1)[0]
    ?.trim();

  if (!username || !/^[A-Za-z0-9_]+$/.test(username)) {
    return null;
  }

  return username;
}

export function buildTelegramBotLink(
  botUsername: string,
  startParameter?: string | null,
): string | null {
  const normalizedUsername = normalizeTelegramBotUsername(botUsername);
  if (!normalizedUsername) {
    return null;
  }

  const url = new URL(`https://t.me/${normalizedUsername}`);
  const normalizedStartParameter = startParameter?.trim();

  if (normalizedStartParameter) {
    url.searchParams.set("start", normalizedStartParameter);
  }

  return url.toString();
}

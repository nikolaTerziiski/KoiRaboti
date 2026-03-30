export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  telegramBotUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
  // Bot-specific (server-only, no NEXT_PUBLIC_ prefix)
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  telegramDailySummarySecret: process.env.TELEGRAM_DAILY_SUMMARY_SECRET ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
};

export function hasSupabaseCredentials() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasTelegramBotCredentials() {
  return Boolean(
    env.telegramBotToken &&
      env.supabaseServiceRoleKey &&
      env.geminiApiKey &&
      env.supabaseUrl,
  );
}

export function hasTelegramSummaryCredentials() {
  return Boolean(hasTelegramBotCredentials() && env.telegramDailySummarySecret);
}

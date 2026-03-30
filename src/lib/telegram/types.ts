// ---------------------------------------------------------------------------
// Bot domain types (camelCase, matching project convention from src/lib/types.ts)
// ---------------------------------------------------------------------------

export interface TelegramUser {
  id: string;
  telegramId: number;
  restaurantId: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  languageCode: string;
  isAdmin: boolean;
  chatId: number | null;
  linkedAt: string | null;
  lastSeenAt: string | null;
  dailySummaryEnabled: boolean;
  summaryTimezone: string;
  summaryHour: number;
  lastSummarySentOn: string | null;
}

export interface ExpenseCategory {
  id: string;
  restaurantId: string;
  name: string;
  emoji: string | null;
  isActive: boolean;
}

export interface TelegramExpenseRecord {
  id: string;
  dailyReportId: string;
  restaurantId: string;
  categoryId: string | null;
  telegramUserId: string | null;
  amount: number;
  amountOriginal: number;
  currencyOriginal: string;
  description: string | null;
  receiptImagePath: string | null;
  receiptOcrText: string | null;
  expenseDate: string;
  sourceType: string;
  createdAt: string;
}

export interface TelegramConnectToken {
  id: string;
  restaurantId: string;
  token: string;
  expiresAt: string;
  claimedAt: string | null;
  claimedByTelegramUserId: string | null;
}

export interface TelegramAiContextChunk {
  id: string;
  restaurantId: string;
  sourceType: string;
  sourceId: string;
  chunkText: string;
  freshnessAt: string;
}

// ---------------------------------------------------------------------------
// Telegram API types (subset we need from the Bot API)
// ---------------------------------------------------------------------------

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramFrom;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  caption?: string;
}

export interface TelegramFrom {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

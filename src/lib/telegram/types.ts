// ---------------------------------------------------------------------------
// Bot domain types (camelCase, matching project convention from src/lib/types.ts)
// ---------------------------------------------------------------------------

export interface Business {
  id: string;
  name: string;
  defaultCurrency: string;
}

export interface TelegramUser {
  id: string;
  telegramId: number;
  businessId: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  languageCode: string;
  isAdmin: boolean;
}

export interface ExpenseCategory {
  id: string;
  businessId: string;
  name: string;
  emoji: string | null;
  isActive: boolean;
}

export interface OperationalExpense {
  id: string;
  businessId: string;
  categoryId: string | null;
  telegramUserId: string | null;
  amount: number;
  amountOriginal: number;
  currencyOriginal: string;
  description: string | null;
  receiptImagePath: string | null;
  expenseDate: string;
  sourceType: string;
  createdAt: string;
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

# KoiRaboti

## Product
KoiRaboti is a mobile-first internal web app for small-business owners (restaurants, cafes, etc.).

Main goals:
- daily attendance tracking
- daily turnover/profit/card/expense tracking (structured expense items with categories)
- employee wage management
- payroll calculation & payments tracking with flexible schedules (weekly, monthly, twice-monthly, on-demand)
- monthly KPI dashboard with trends and charts
- CSV export of daily reports and transactions
- Telegram bot for AI-powered expense tracking with daily summaries

## Stack
- Next.js 16 App Router (React 19)
- TypeScript
- Tailwind CSS 4 with CSS custom properties theming
- shadcn/ui (New York style)
- Supabase (PostgreSQL, Auth, RLS, Storage)
- Vercel (with `@vercel/functions` waitUntil for background processing)
- Recharts (dashboard charts)
- Google Gemini AI (Telegram bot expense categorization, `gemini-2.5-flash`)
- Inter font (latin + cyrillic subsets via next/font/google)

## UX
- Mobile-first with responsive desktop sidebar at `lg:` breakpoint (1024px+)
- Fast daily input flow with large touch targets and minimal typing
- Green accent on neutral foundation — professional, clean aesthetic
- Bilingual: English and Bulgarian (locale switcher in header/sidebar)
- Design system conventions:
  - Cards: `rounded-2xl`
  - Inputs, buttons, alerts: `rounded-lg`
  - White overlays: `bg-white/10`, `bg-white/15`, `border-white/15`
  - No hardcoded hex colors — everything via CSS custom properties

## Layout
- **Desktop (lg+):** Fixed left sidebar (240px) with logo, vertical nav, session/data badges, locale switcher, logout. Content area offset with `lg:pl-60`.
- **Mobile:** Card header with logo + page title + badges + controls. Bottom tab navigation bar (`MobileNav`). Extra bottom padding (`pb-28`) to clear the nav.
- Key files: `src/components/layout/app-shell.tsx`, `src/components/layout/mobile-nav.tsx`

## Auth flow
- **Login:** Email/password via Supabase, or demo mode (any credentials when Supabase not configured)
- **Registration:** Simplified to email + password only
- **Onboarding:** Post-signup page (`/onboarding`) collects business name + admin full name, calls `register_restaurant` RPC (also seeds default expense categories)
- Demo mode uses a cookie (`koi-raboti-demo-session`) and mock data

## Data model

### Core tables
- `restaurants` — multi-tenant foundation
- `profiles` — linked to auth.users and restaurants
- `employees` — with roles (kitchen/service), payment schedule, phone tracking
- `daily_reports` — per-day report; `manual_expense` is auto-derived from `daily_expense_items` via trigger
- `attendance_entries` — per-employee per-day
- `payroll_payments` — payment_type: advance/payroll

### Expense system
- `restaurant_expense_categories` — per-restaurant custom categories (seeded on registration via `seed_restaurant_expense_categories`)
- `daily_expense_items` — structured expense items linked to daily_reports; fields: amount, amount_original, currency_original, description, receipt_image_path, receipt_ocr_text, source_type (web/telegram), telegram_user_id, category_id

### Telegram integration tables
- `telegram_users` — maps Telegram account → restaurant (restaurant_id); includes daily summary settings (daily_summary_enabled, summary_timezone, summary_hour, last_summary_sent_on) and linking metadata (chat_id, linked_at, last_seen_at)
- `telegram_connect_tokens` — short-lived tokens for secure profile→bot linking flow
- `telegram_ai_context_chunks` — RAG-style context store: text chunks from expense items (description + OCR) for Gemini queries

### Legacy bot tables (kept for migration compatibility)
- `businesses` — legacy generic business entity
- `expense_categories` — legacy per-business categories
- `operational_expenses` — legacy expense records
- `business_restaurant_links` — bridge from legacy businesses to canonical restaurants

## Business rules
- Multi-tenant DB schema (users see/manage only their restaurant via RLS)
- Each employee has a `daily_rate` (stored in EUR, displayed in BGN)
- Employee role used for grouping and color-coding
- A person may work 1, 1.5, or 2 shifts in one day (`pay_units`)
- Attendance stores: pay_units, pay_override (nullable), snapshot of daily_rate at time of entry
- Payroll formula: pay_override if present, else daily_rate × pay_units
- `daily_reports.manual_expense` is auto-synced via DB trigger and `syncDailyReportManualExpense()` — always equals the sum of that day's `daily_expense_items`
- Currency: all amounts stored in EUR, displayed as EUR + BGN equivalent at fixed rate 1.95583
- Employee payment schedule: `payment_schedule` (twice_monthly/weekly/monthly/on_demand) with explicit day fields (`payment_day_1`, `payment_day_2`, `payment_weekday`). `balance_starts_from` excludes attendance/advances before that date from running balance.
- Per-employee payroll settings can use restaurant defaults (`use_restaurant_payroll_defaults = true`) or be overridden individually

## Pages
- `/` — Route guard: guests → `/login`, authenticated → `/today`, new users → `/onboarding`
- `/login` — Email/password auth with demo mode support
- `/register` — Account creation (email + password)
- `/onboarding` — Post-signup profile setup (business name, admin name)
- `/today` — Daily report & attendance input + dashboard trends
- `/employees` — Employee roster management (CRUD, active/inactive toggle)
- `/employees/[id]` — Individual employee timesheet (attendance history + payroll payments)
- `/payroll` — Payroll calculation with flexible schedule support, advances & settlements
- `/reports` — Historical daily reports with corrections and CSV export
- `/transactions` — Expense transaction log: all `daily_expense_items` grouped by date, with search/date filters and CSV export
- `/profile` — Monthly KPI snapshot, restaurant/payroll settings, Telegram Connect card

## Key lib files
- `src/lib/types.ts` — all shared TypeScript types
- `src/lib/payroll.ts` — payroll window calculation, `PayrollWindowPreset` (week/month/first_half/second_half), `buildPayrollRows`, `summarizePayrollRows`
- `src/lib/employee-payment-schedule.ts` — `normalizeEmployeePaymentConfig`, coercion and validation for payment schedule fields
- `src/lib/payroll-settings.ts` — `parseRestaurantPayrollSettings`, `parseEmployeePayrollSettings`, draft builders for form state
- `src/lib/expenses.ts` — `sanitizeExpenseItems`, `calculateExpenseTotal`, `buildExpenseCategoryTotals`
- `src/lib/expense-persistence.ts` — `replaceDailyReportExpenseItems` (delete+insert+AI context sync), `syncDailyReportManualExpense`
- `src/lib/transactions.ts` — `flattenTransactionRows`, `filterTransactionRows`, `groupTransactionRowsByDate`, `buildTransactionsCsvContent`
- `src/lib/format.ts` — `formatCurrencyPair`, `bgnToEur`, currency formatting
- `src/lib/profile-stats.ts` — monthly KPI calculation
- `src/lib/csv-export.ts` — daily reports CSV export
- `src/lib/supabase/data.ts` — `getRestaurantSnapshot`, `getUserRestaurantId`
- `src/lib/env.ts` — typed env vars with `hasSupabaseCredentials()`, `hasTelegramBotCredentials()`, `hasTelegramSummaryCredentials()`

## Telegram Expense Bot

### Purpose
Telegram bot for expense tracking via natural language + photos. Linked to a restaurant via a connect token flow from the profile page. Independent of legacy `businesses` tables.

### Architecture
- **Webhook**: `src/app/api/telegram/webhook/route.ts` — receives Telegram updates
- **Daily summary**: `src/app/api/telegram/daily-summary/route.ts` — cron-triggered endpoint that sends daily reports to opted-in users
- **Setup**: `src/app/api/telegram/setup/route.ts` — one-time webhook registration
- **Handler**: `src/lib/telegram/handler.ts` — orchestrator (connect flow, commands, AI flow)
- **Gemini AI**: `src/lib/telegram/gemini.ts` — function calling agent (save_expense, query_expenses, get_expense_summary, list_categories, add_category)
- **Executor**: `src/lib/telegram/executor.ts` — executes Gemini's function calls against the DB
- **Data layer**: `src/lib/telegram/data.ts` — CRUD for telegram_users, restaurant_expense_categories, daily_expense_items, connect tokens, AI context, payroll/attendance queries
- **Telegram API**: `src/lib/telegram/api.ts` — sendMessage, getFileUrl, setWebhook
- **Receipts**: `src/lib/telegram/receipts.ts` — download Telegram photos, upload to Supabase Storage for Gemini Vision
- **Links**: `src/lib/telegram/links.ts` — `normalizeTelegramBotUsername`, `buildTelegramBotLink`
- **Types**: `src/lib/telegram/types.ts` — TelegramUser, TelegramConnectToken, TelegramAiContextChunk, TelegramExpenseRecord, Telegram API types
- **Admin client**: `src/lib/supabase/admin.ts` — service role Supabase client (bypasses RLS)

### Connect flow
- Profile page generates a `telegram_connect_tokens` record and passes a deep link with a `start=<token>` parameter
- Bot handler detects the `/start <token>` command, claims the token, links `telegram_users.restaurant_id`
- `telegramConfigState` on profile: `connectable` | `missing_public_username` | `not_configured`

### Bot commands
- `/start [token]` — onboarding or connect flow
- `/help` — usage info
- `/categories` — list categories (Gemini)
- `/summary` — expense summary (Gemini)
- `/daily_on` — enable daily summary
- `/daily_off` — disable daily summary

### Daily summary
- Endpoint: `GET /api/telegram/daily-summary?secret=<TELEGRAM_DAILY_SUMMARY_SECRET>`
- Queries `telegram_users` where `daily_summary_enabled = true` and `last_summary_sent_on` is not today (per user's `summary_timezone`)
- Sends a formatted message with turnover, profit, card, expenses, attendance count, and open actions
- Marks `last_summary_sent_on` after sending

### AI context (RAG)
- `telegram_ai_context_chunks` stores text from expense items (description + receipt OCR) keyed by `source_id`
- Updated on every `replaceDailyReportExpenseItems` call in `expense-persistence.ts`
- Gemini can query this for context-aware expense searches

### Key design decisions
- Bot uses Supabase service role key — no cookies, bypasses RLS
- All amounts stored in EUR; user input assumed BGN unless stated otherwise
- `telegram_users.restaurant_id` is the authoritative link (not `business_id`)
- Webhook uses `waitUntil()` for background processing (Vercel Pro: 60s timeout)

### Environment variables
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — bot username (client-accessible, for Connect button)
- `NEXT_PUBLIC_APP_URL` — canonical app URL (used for deep links in bot messages)
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard (server-only)
- `TELEGRAM_BOT_TOKEN` — from @BotFather (server-only)
- `TELEGRAM_WEBHOOK_SECRET` — random string for webhook verification (server-only)
- `TELEGRAM_DAILY_SUMMARY_SECRET` — secret for the daily-summary cron endpoint (server-only)
- `GEMINI_API_KEY` — from Google AI Studio (server-only)

## Scope limits
- No weekly scheduling in MVP
- No bonuses/deductions in MVP (handled via manual advances/overrides if needed)
- No POS integration in MVP
- No over-engineering

## Working style
- Explain plan briefly first
- Implement in small steps
- Keep code explicit and maintainable
- Run lint/build/dev checks when possible
- Summarize created files and assumptions

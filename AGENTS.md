# KoiRaboti

## Product
KoiRaboti is a mobile-first internal web app for a restaurant owner.

Main goals:
- daily attendance tracking
- daily turnover/profit/card/manual expense tracking
- employee wage management
- payroll calculation & payments tracking for:
  - 1st to 15th (first_half)
  - 16th to end of month (second_half)
  - including advances and payroll settlements

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (PostgreSQL, Auth, RLS)
- Vercel

## UX
- Mobile-first
- Fast daily input flow
- Large touch targets
- Minimal typing
- Green brand theme from the beginning
- Do basic theming now, not full UI polish

## Data model
- restaurants (multi-tenant foundation)
- profiles (linked to auth.users and restaurants)
- employees (with roles: kitchen/service and phone tracking)
- daily_reports
- attendance_entries
- payroll_payments (payment_type: advance/payroll)

## Business rules
- Multi-tenant DB schema (users see/manage only their restaurant via RLS)
- Each employee has a daily_rate (stored in EUR, displayed in BGN)
- Employee role used for grouping and color-coding
- A person may work 1, 1.5, or 2 shifts in one day (pay_units)
- Attendance stores:
  - pay_units: 1 / 1.5 / 2
  - pay_override nullable
  - captured snapshot of daily_rate
- Payroll formula:
  - pay_override if present
  - else daily_rate * pay_units
- daily_reports.manual_expense has a dynamic default based on the restaurant's settings

## Scope limits
- No weekly scheduling in MVP
- No bonuses/deductions in MVP (handled via manual advances/overrides if needed)
- No POS integration in MVP
- No over-engineering

## Telegram Expense Bot (added 2026-03-25)

### Purpose
Standalone Telegram bot for expense tracking via natural language + photos.
Works for any business type (restaurant, roadside assistance, etc.) — independent of the restaurant tables.

### Architecture
- **Webhook**: `src/app/api/telegram/webhook/route.ts` — Next.js API route, receives Telegram updates
- **Handler**: `src/lib/telegram/handler.ts` — orchestrator (onboarding, commands, AI flow)
- **Gemini AI**: `src/lib/telegram/gemini.ts` — function calling agent (save_expense, query_expenses, get_expense_summary, list_categories, add_category)
- **Executor**: `src/lib/telegram/executor.ts` — executes Gemini's function calls against the DB
- **Data layer**: `src/lib/telegram/data.ts` — CRUD for businesses, telegram_users, expense_categories, operational_expenses
- **Telegram API**: `src/lib/telegram/api.ts` — sendMessage, getFileUrl, setWebhook
- **Receipts**: `src/lib/telegram/receipts.ts` — download Telegram photos for Gemini Vision
- **Admin client**: `src/lib/supabase/admin.ts` — service role Supabase client (bypasses RLS)

### Database tables (bot-specific)
- `businesses` — generic business entity (not tied to restaurants)
- `telegram_users` — maps Telegram account → business
- `expense_categories` — per-business custom categories (seeded on creation)
- `operational_expenses` — expense records with EUR storage, original amount/currency, receipt path

### Key design decisions
- Bot uses Supabase service role key (not anon) — no cookies, bypasses RLS
- All amounts stored in EUR; user input assumed BGN unless stated otherwise
- Currency conversion reuses `bgnToEur()` from `src/lib/format.ts`
- Gemini model: `gemini-2.0-flash` (fast, cheap, supports vision for receipts)
- Onboarding: first message creates telegram_user, user provides business name, bot seeds default categories
- Commands (/start, /help) handled directly without AI; /categories and /summary delegated to Gemini

### Environment variables (server-only)
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard
- `TELEGRAM_BOT_TOKEN` — from @BotFather
- `TELEGRAM_WEBHOOK_SECRET` — random string for webhook verification
- `GEMINI_API_KEY` — from Google AI Studio

### Migration
- `supabase/patch_expense_bot_tables.sql` — creates all bot tables, rewrites operational_expenses, adds RLS policies and seed function

## Working style
- Explain plan briefly first
- Implement in small steps
- Keep code explicit and maintainable
- Run lint/build/dev checks when possible
- Summarize created files and assumptions
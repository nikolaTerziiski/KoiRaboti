# KoiRaboti

## Product
KoiRaboti is a mobile-first internal web app for small-business owners (restaurants, cafes, etc.).

Main goals:
- daily attendance tracking
- daily turnover/profit/card/manual expense tracking
- employee wage management
- payroll calculation & payments tracking for:
  - 1st to 15th (first_half)
  - 16th to end of month (second_half)
  - including advances and payroll settlements
- monthly KPI dashboard with trends and charts
- CSV export of daily reports
- Telegram bot for AI-powered expense tracking

## Stack
- Next.js 16 App Router (React 19)
- TypeScript
- Tailwind CSS 4 with CSS custom properties theming
- shadcn/ui (New York style)
- Supabase (PostgreSQL, Auth, RLS, Storage)
- Vercel (with `@vercel/functions` waitUntil for background processing)
- Recharts (dashboard charts)
- Google Gemini AI (Telegram bot expense categorization)
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
- **Onboarding:** Post-signup page (`/onboarding`) collects business name + admin full name, calls `register_restaurant` RPC
- Demo mode uses a cookie (`koi-raboti-demo-session`) and mock data

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
- Currency: all amounts stored in EUR, displayed as EUR + BGN equivalent at fixed rate 1.95583

## Pages
- `/` — Route guard: guests → `/login`, authenticated → `/today`, new users → `/onboarding`
- `/login` — Email/password auth with demo mode support
- `/register` — Account creation (email + password)
- `/onboarding` — Post-signup profile setup (business name, admin name)
- `/today` — Daily report & attendance input + dashboard trends
- `/employees` — Employee roster management (CRUD, active/inactive toggle)
- `/payroll` — Bi-monthly payroll calculation with advances & settlements
- `/reports` — Historical daily reports with corrections and CSV export
- `/profile` — Monthly KPI snapshot, user profile, Telegram Connect card

## Telegram Expense Bot

### Purpose
Standalone Telegram bot for expense tracking via natural language + photos.
Works for any business type (restaurant, roadside assistance, etc.) — independent of the restaurant tables.

### Architecture
- **Webhook**: `src/app/api/telegram/webhook/route.ts` — Next.js API route, receives Telegram updates
- **Setup**: `src/app/api/telegram/setup/route.ts` — One-time webhook registration (GET with secret)
- **Handler**: `src/lib/telegram/handler.ts` — orchestrator (onboarding, commands, AI flow)
- **Gemini AI**: `src/lib/telegram/gemini.ts` — function calling agent (save_expense, query_expenses, get_expense_summary, list_categories, add_category)
- **Executor**: `src/lib/telegram/executor.ts` — executes Gemini's function calls against the DB
- **Data layer**: `src/lib/telegram/data.ts` — CRUD for businesses, telegram_users, expense_categories, operational_expenses
- **Telegram API**: `src/lib/telegram/api.ts` — sendMessage, getFileUrl, setWebhook
- **Receipts**: `src/lib/telegram/receipts.ts` — download Telegram photos, upload to Supabase Storage for Gemini Vision
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
- Gemini model: `gemini-2.5-flash` (fast, cheap, supports vision for receipts)
- Onboarding: first message creates telegram_user, user provides business name, bot seeds default categories
- Commands (/start, /help) handled directly without AI; /categories and /summary delegated to Gemini
- Webhook uses `waitUntil()` for background processing (Vercel Pro: 60s timeout)

### Web integration
- Profile page shows a "Telegram Connect" card when `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` env var is set
- Links to `https://t.me/{username}` to start the bot

### Environment variables
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — bot username (client-accessible, for Connect button)
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard (server-only)
- `TELEGRAM_BOT_TOKEN` — from @BotFather (server-only)
- `TELEGRAM_WEBHOOK_SECRET` — random string for webhook verification (server-only)
- `GEMINI_API_KEY` — from Google AI Studio (server-only)

### Migration
- `supabase/patch_expense_bot_tables.sql` — creates all bot tables, rewrites operational_expenses, adds RLS policies and seed function

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

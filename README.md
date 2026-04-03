# KoiRaboti

KoiRaboti is a mobile-first internal restaurant app built with Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI primitives, and Supabase-ready data access.

## What is included

- `/login` for admin sign-in or demo mode
- `/today` for daily attendance and finance input
- `/employees` for roster and daily rate management
- `/payroll` for flexible payroll settlement ranges with weekly, monthly, and custom views
- `/reports` for daily report history
- `/profile` for monthly stats and labor cost overview
- Green design tokens and reusable cards, buttons, inputs, labels, and selects
- Bulgarian and English UI with a simple locale switcher
- Supabase client helpers, SQL schema, and sample seed data
- Demo snapshot fallback so the app runs before a live Supabase project is connected
- Real Supabase persistence for Today, Employees, and report corrections
- Real Supabase persistence for payroll advances and date-range settlements
- EUR-first money handling with BGN display at a fixed rate of `1.95583`

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- shadcn-compatible component setup
- Supabase
- Vercel-ready configuration

## Environment variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Required for live Supabase mode:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

If these are omitted, the app runs in demo mode with seeded local snapshot data.
If they are present but Supabase queries fail, the app shows a visible live data error instead of silently falling back to demo data.

## Currency handling

- Monetary values are treated primarily as EUR in the app and database.
- The UI also shows the BGN equivalent using the fixed rate `1 EUR = 1.95583 BGN`.
- The default `manual_expense` is the EUR equivalent of `800 BGN`.

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Add the environment variables above to `.env.local`.
3. Run the SQL in `supabase/schema_current.sql`.
4. If you want a realistic sandbox tenant, run `supabase/seed_large.sql` and then a tenant seed such as `supabase/seed_genge_abv_bg.sql`.
5. Create one admin user in Supabase Auth.
6. Start the app and sign in from `/login`.

Legacy patch files are still in the repo for older databases, but they are no longer part of the recommended setup for a new project:

- `supabase/legacy/patch_add_employee_role.sql`
- `supabase/legacy/patch_simplify_attendance_phone.sql`
- `supabase/legacy/patch_add_payroll_payments.sql`
- `supabase/legacy/patch_add_historical_rate.sql`
- `supabase/legacy/patch_register_fn.sql`
- `supabase/legacy/patch_expense_bot_tables.sql`
- `supabase/legacy/patch_restaurant_expense_categories.sql`

For the current SQL file map, see `supabase/README.md`.

## Backup and sandbox workflow

If you want a disposable backup DB with enough volume to exercise the UI properly, use the scripts in `scripts/`.

### Bootstrap and seed a backup database

Prerequisites:

- PostgreSQL client tools available in `PATH` (`psql`, `pg_dump`)
- One auth user already created in the target Supabase project

Apply the current schema, Telegram patches, helper functions, and realistic seed data:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\supabase-sandbox.ps1 `
  -DbUrl "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" `
  -ResetDatabase `
  -UserId "YOUR_AUTH_USER_UUID" `
  -UserEmail "owner@example.com" `
  -RestaurantName "Koi Raboti Sandbox" `
  -AdminName "Sandbox Owner" `
  -Months 6 `
  -EmployeeCount 18 `
  -ReplaceExistingData
```

What this gives you:

- 1 restaurant linked to your auth user profile
- 18 employees with mixed kitchen/service roles and a few inactive staff
- Daily reports from the start of the chosen month window until today
- Attendance with 1 / 1.5 / 2 pay units and occasional overrides
- Expense categories, daily expense items, receipt paths, and Telegram-origin expenses
- Payroll advances and payroll settlements for closed periods
- Telegram users, connect tokens, and AI context chunks

The reusable SQL helpers live in `supabase/seed_large.sql`.

### Dump or clone app data

The backup script exports the app-owned `public` schema. By default it skips `public.profiles`, because those rows depend on `auth.users` and usually fail when restored into a different Supabase project.

Create a backup file:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\supabase-backup.ps1 `
  -Mode dump `
  -SourceDbUrl "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

Clone directly into another target database:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\supabase-backup.ps1 `
  -Mode clone `
  -SourceDbUrl "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" `
  -TargetDbUrl "postgresql://postgres:[PASSWORD]@[BACKUP-HOST]:5432/postgres"
```

If you need to move profile rows too, add `-IncludeProfiles`, but only do that when the target has matching `auth.users` data.

After restoring without profiles, attach your backup auth user to a restaurant with:

```sql
select public.attach_user_to_restaurant(
  p_user_id := 'YOUR_AUTH_USER_UUID',
  p_user_email := 'owner@example.com',
  p_full_name := 'Sandbox Owner',
  p_restaurant_id := 'RESTAURANT_UUID',
  p_force_move := true
);
```

## Validation commands

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npm run dev
```

## Reusable prompts

- Landing/auth responsiveness audit prompt: `prompts/landing-auth-responsiveness-audit.md`

## Project structure

```text
.
|-- src
|   |-- actions
|   |-- app
|   |-- components
|   |   |-- auth
|   |   |-- employees
|   |   |-- layout
|   |   |-- payroll
|   |   |-- reports
|   |   |-- today
|   |   `-- ui
|   `-- lib
|       |-- supabase
|       `-- ...
|-- supabase
|   |-- schema_current.sql
|   |-- seed_large.sql
|   `-- legacy
|-- components.json
|-- .env.example
`-- README.md
```

## Notes

- `daily_reports.manual_expense` defaults to the EUR equivalent of `800 BGN`.
- Payroll amount uses `pay_override` when present, otherwise `daily_rate * pay_units`.
- Attendance rows store the employee daily rate at save time so past payroll calculations stay immutable after later wage changes.
- `/today` saves `daily_reports` plus attendance upserts and removes deselected attendance rows for the same day.
- Attendance is now simplified to presence plus `pay_units` only. The fast daily flow no longer uses `shift_1` / `shift_2`.
- `/employees` saves create, edit, and active/inactive changes with `is_active` soft status.
- `/employees` now stores a `role` for Kitchen or Service so the UI can group staff clearly.
- `/reports` can correct past financial numbers, `pay_units`, and optional `pay_override` values.
- `/profile` shows current-month averages, totals, and labor cost.
- Weekly scheduling, bonuses/deductions, and POS integration are intentionally out of scope for this MVP.




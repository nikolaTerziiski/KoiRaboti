# KoiRaboti

KoiRaboti is a mobile-first internal restaurant app built with Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI primitives, and Supabase-ready data access.

## What is included

- `/login` for admin sign-in or demo mode
- `/today` for daily attendance and finance input
- `/employees` for roster and daily rate management
- `/payroll` for the two payroll periods:
  - 1st to 15th
  - 16th to end of month
- `/reports` for daily report history
- Green design tokens and reusable cards, buttons, inputs, labels, and selects
- Bulgarian and English UI with a simple locale switcher
- Supabase client helpers, SQL schema, and sample seed data
- Demo snapshot fallback so the app runs before a live Supabase project is connected
- Real Supabase persistence for Today, Employees, and report corrections
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
3. Run the SQL in `supabase/schema.sql`.
4. Run the SQL in `supabase/seed.sql`.
5. Create one admin user in Supabase Auth.
6. Start the app and sign in from `/login`.

If you already have an older KoiRaboti database, run `supabase/patch_simplify_attendance_phone.sql`
before using the updated UI. It makes employee phone numbers optional and removes the old
`shift_1` / `shift_2` attendance columns.

## Validation commands

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npm run dev
```

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
|   |-- schema.sql
|   `-- seed.sql
|-- components.json
|-- .env.example
`-- README.md
```

## Notes

- `daily_reports.manual_expense` defaults to the EUR equivalent of `800 BGN`.
- Payroll amount uses `pay_override` when present, otherwise `daily_rate * pay_units`.
- `/today` saves `daily_reports` plus attendance upserts and removes deselected attendance rows for the same day.
- Attendance is now simplified to presence plus `pay_units` only. The fast daily flow no longer uses `shift_1` / `shift_2`.
- `/employees` saves create, edit, and active/inactive changes with `is_active` soft status.
- `/reports` can correct past financial numbers, `pay_units`, and optional `pay_override` values.
- Weekly scheduling, bonuses/deductions, and POS integration are intentionally out of scope for this MVP.

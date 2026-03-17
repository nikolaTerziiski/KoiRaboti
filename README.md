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
- Supabase client helpers, SQL schema, and sample seed data
- Demo snapshot fallback so the app runs before a live Supabase project is connected

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

## Validation commands

```bash
npm run lint
npm run typecheck
npm run build
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

- `daily_reports.manual_expense` defaults to `800`.
- Payroll amount uses `pay_override` when present, otherwise `daily_rate * pay_units`.
- Weekly scheduling, bonuses/deductions, and POS integration are intentionally out of scope for this MVP.

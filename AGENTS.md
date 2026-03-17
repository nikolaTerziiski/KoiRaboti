# KoiRaboti

## Product
KoiRaboti is a mobile-first internal web app for a restaurant owner.

Main goals:
- daily attendance tracking
- daily turnover/profit/card/manual expense tracking
- employee wage management
- payroll calculation for:
  - 1st to 15th
  - 16th to end of month

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Vercel

## UX
- Mobile-first
- Fast daily input flow
- Large touch targets
- Minimal typing
- Green brand theme from the beginning
- Do basic theming now, not full UI polish

## Data model
- profiles
- employees
- daily_reports
- attendance_entries

## Business rules
- One restaurant
- One admin user for MVP
- Each employee has daily_rate
- A person may work 1, 1.5, or 2 shifts in one day
- Attendance stores:
  - shift_1
  - shift_2
  - pay_units: 1 / 1.5 / 2
  - pay_override nullable
- Payroll formula:
  - pay_override if present
  - else daily_rate * pay_units
- daily_reports.manual_expense default = 800

## Scope limits
- No weekly scheduling in MVP
- No bonuses/deductions in MVP
- No POS integration in MVP
- No over-engineering

## Working style
- Explain plan briefly first
- Implement in small steps
- Keep code explicit and maintainable
- Run lint/build/dev checks when possible
- Summarize created files and assumptions
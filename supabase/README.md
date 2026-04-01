# Supabase SQL Guide

## Use these for current setup

- `schema_current.sql`
  Fresh install for the current app schema. This is the canonical file for new projects.
- `seed_large.sql`
  Reusable sandbox helpers and realistic high-volume seed data.
- `reset_all.sql`
  Full reset for disposable local/backup databases.

Optional tenant-specific helpers:

- `seed_genge_abv_bg.sql`
- `cleanup_genge_abv_bg.sql`

## Legacy / historical files

These are kept only as migration history for older databases and should not be used for a fresh project:

- `legacy/schema.sql`
  Older base schema before Telegram expense and restaurant-scoped expense expansion.
- `legacy/seed.sql`
  Small demo seed from the earlier app version.
- `legacy/reset.sql`
  Older partial reset script.
- `legacy/patch_add_employee_role.sql`
- `legacy/patch_add_historical_rate.sql`
- `legacy/patch_add_payroll_payments.sql`
- `legacy/patch_payroll_settlement_ranges.sql`
- `legacy/patch_register_fn.sql`
- `legacy/patch_simplify_attendance_phone.sql`
- `legacy/patch_expense_bot_tables.sql`
- `legacy/patch_restaurant_expense_categories.sql`

## Recommended order

For a brand-new project:

1. Run `schema_current.sql`
2. Run `seed_large.sql`
3. Run a tenant-specific seed such as `seed_genge_abv_bg.sql`

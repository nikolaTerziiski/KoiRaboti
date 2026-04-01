-- Full reset for the current KoiRaboti schema.
-- Run only against a disposable local/backup database.

drop table if exists public.daily_expense_items cascade;
drop table if exists public.payroll_payments cascade;
drop table if exists public.attendance_entries cascade;
drop table if exists public.daily_reports cascade;
drop table if exists public.employees cascade;
drop table if exists public.telegram_ai_context_chunks cascade;
drop table if exists public.telegram_connect_tokens cascade;
drop table if exists public.restaurant_expense_categories cascade;
drop table if exists public.business_restaurant_links cascade;
drop table if exists public.operational_expenses cascade;
drop table if exists public.expense_categories cascade;
drop table if exists public.telegram_users cascade;
drop table if exists public.businesses cascade;
drop table if exists public.profiles cascade;
drop table if exists public.restaurants cascade;

drop function if exists public.seed_koi_raboti_sandbox(
  uuid,
  text,
  text,
  text,
  integer,
  integer,
  boolean
) cascade;
drop function if exists public.attach_user_to_restaurant(
  uuid,
  text,
  text,
  uuid,
  boolean
) cascade;
drop function if exists public.sync_daily_report_manual_expense_from_items() cascade;
drop function if exists public.seed_restaurant_expense_categories(uuid) cascade;
drop function if exists public.seed_default_categories(uuid) cascade;
drop function if exists public.register_restaurant(
  uuid,
  text,
  text,
  text,
  numeric,
  text,
  integer,
  integer,
  integer,
  integer
) cascade;
drop function if exists public.register_restaurant(text, text, numeric) cascade;
drop function if exists public.get_user_restaurant_id() cascade;
drop function if exists public.set_updated_at() cascade;

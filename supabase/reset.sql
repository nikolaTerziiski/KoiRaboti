-- ⚠️  Run this ONCE to drop the old schema before applying schema.sql.
--     All existing data will be lost.
--     CASCADE handles policies, indexes and triggers automatically.

drop table if exists public.attendance_entries cascade;
drop table if exists public.daily_reports       cascade;
drop table if exists public.employees           cascade;
drop table if exists public.profiles            cascade;
drop table if exists public.restaurants         cascade;

drop function if exists public.register_restaurant(text, text, numeric) cascade;
drop function if exists public.get_user_restaurant_id()                  cascade;
drop function if exists public.set_updated_at()                          cascade;

-- Patch: simplify attendance model and make employee phone optional
-- Safe to run on an existing database before applying the new UI logic.

alter table if exists public.employees
  alter column phone_number drop not null;

drop index if exists public.employees_restaurant_phone_unique;

create unique index if not exists employees_restaurant_phone_unique
  on public.employees (restaurant_id, regexp_replace(phone_number, '\D', '', 'g'));

alter table if exists public.attendance_entries
  drop column if exists shift_1,
  drop column if exists shift_2;

comment on column public.employees.phone_number is 'Optional. Stored as entered. Uniqueness is enforced on the normalised digits-only form per restaurant.';
comment on column public.attendance_entries.pay_units is 'Number of paid shifts for the day: 1, 1.5, or 2.';

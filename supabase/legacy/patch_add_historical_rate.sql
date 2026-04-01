-- Patch: snapshot employee daily rate on attendance entries.
-- Safe to run on an existing database before applying the historical wage integrity fix.

alter table if exists public.attendance_entries
  add column if not exists daily_rate numeric(10, 4);

update public.attendance_entries ae
set daily_rate = e.daily_rate
from public.employees e
where ae.employee_id = e.id
  and ae.daily_rate is null;

alter table if exists public.attendance_entries
  alter column daily_rate set not null;

alter table if exists public.attendance_entries
  drop constraint if exists attendance_entries_daily_rate_non_negative;

alter table if exists public.attendance_entries
  add constraint attendance_entries_daily_rate_non_negative check (daily_rate >= 0);

comment on column public.attendance_entries.daily_rate is 'Stored in EUR snapshot of the employee daily_rate at the time the attendance entry is saved.';

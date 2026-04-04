-- Migration: Add percentage-based pay support
-- Employees can now have pay_type = 'fixed' (default) or 'fixed_plus_percentage'
-- When fixed_plus_percentage, their total pay = (daily_rate * pay_units) + (shift_turnover * percentage_rate)

-- 1. Add pay_type, percentage_rate, and turnover_source to employees
alter table public.employees
  add column if not exists pay_type text not null default 'fixed'
    check (pay_type in ('fixed', 'fixed_plus_percentage'));

alter table public.employees
  add column if not exists percentage_rate numeric(6, 4) not null default 0
    check (percentage_rate >= 0 and percentage_rate <= 1);

alter table public.employees
  add column if not exists turnover_source text not null default 'personal'
    check (turnover_source in ('personal', 'department'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'employees_percentage_rate_consistency_check'
  ) then
    alter table public.employees
      add constraint employees_percentage_rate_consistency_check check (
        pay_type = 'fixed_plus_percentage' or percentage_rate = 0
      );
  end if;
end $$;

-- 2. Add percentage calculation fields to attendance_entries
alter table public.attendance_entries
  add column if not exists shift_turnover numeric(12, 4)
    check (shift_turnover is null or shift_turnover >= 0);

alter table public.attendance_entries
  add column if not exists percentage_rate_snapshot numeric(6, 4)
    check (
      percentage_rate_snapshot is null
      or (percentage_rate_snapshot >= 0 and percentage_rate_snapshot <= 1)
    );

-- 3. Add comments
comment on column public.employees.pay_type is 'Payment calculation mode: fixed (daily_rate * pay_units) or fixed_plus_percentage (base + turnover * percentage_rate).';
comment on column public.employees.percentage_rate is 'Percentage of shift turnover added to base pay. Stored as decimal (e.g., 0.02 = 2%). Only used when pay_type = fixed_plus_percentage.';
comment on column public.employees.turnover_source is 'Source of turnover for percentage calculation: personal (employee own shift turnover) or department (kitchen/department total entered by manager).';
comment on column public.attendance_entries.shift_turnover is 'Turnover amount this employee percentage bonus is calculated against. NULL for fixed-pay employees.';
comment on column public.attendance_entries.percentage_rate_snapshot is 'Snapshot of the percentage rate applied on the day of the shift. Used to keep historical payroll stable if the employee percentage changes later.';

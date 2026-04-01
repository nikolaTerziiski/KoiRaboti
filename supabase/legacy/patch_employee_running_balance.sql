alter table public.employees
  add column if not exists payment_schedule text,
  add column if not exists payment_day_1 integer,
  add column if not exists payment_day_2 integer,
  add column if not exists payment_weekday integer,
  add column if not exists balance_starts_from date;

update public.employees
set
  payment_schedule = coalesce(
    payment_schedule,
    case payroll_cadence
      when 'weekly' then 'weekly'
      when 'monthly' then 'monthly'
      when 'daily' then 'on_demand'
      when 'twice_monthly' then 'twice_monthly'
      else 'twice_monthly'
    end
  ),
  payment_day_1 = coalesce(
    payment_day_1,
    least(
      greatest(
        coalesce(
          case
            when payroll_cadence = 'monthly' then monthly_pay_day
            else twice_monthly_day_1
          end,
          1
        ),
        1
      ),
      28
    )
  ),
  payment_day_2 = coalesce(
    payment_day_2,
    least(greatest(coalesce(twice_monthly_day_2, 16), 1), 28)
  ),
  payment_weekday = coalesce(
    payment_weekday,
    least(greatest(coalesce(weekly_payday, 1), 1), 7)
  ),
  balance_starts_from = coalesce(balance_starts_from, current_date);

update public.employees
set payment_day_2 = case
  when payment_day_1 = 28 then 27
  else payment_day_1 + 1
end
where payment_schedule = 'twice_monthly'
  and payment_day_1 = payment_day_2;

alter table public.employees
  alter column payment_schedule set default 'twice_monthly',
  alter column payment_schedule set not null,
  alter column payment_day_1 set default 1,
  alter column payment_day_1 set not null,
  alter column payment_day_2 set default 16,
  alter column payment_day_2 set not null,
  alter column payment_weekday set default 1,
  alter column payment_weekday set not null,
  alter column balance_starts_from set default current_date,
  alter column balance_starts_from set not null;

alter table public.employees
  drop constraint if exists employees_payment_schedule_check,
  drop constraint if exists employees_payment_day_1_check,
  drop constraint if exists employees_payment_day_2_check,
  drop constraint if exists employees_payment_weekday_check,
  drop constraint if exists employees_payment_schedule_shape_check;

alter table public.employees
  add constraint employees_payment_schedule_check
    check (payment_schedule in ('twice_monthly', 'weekly', 'monthly', 'on_demand')),
  add constraint employees_payment_day_1_check
    check (payment_day_1 between 1 and 28),
  add constraint employees_payment_day_2_check
    check (payment_day_2 between 1 and 28),
  add constraint employees_payment_weekday_check
    check (payment_weekday between 1 and 7),
  add constraint employees_payment_schedule_shape_check
    check (
      (
        payment_schedule = 'weekly'
        and payment_weekday between 1 and 7
      )
      or (
        payment_schedule = 'monthly'
        and payment_day_1 between 1 and 28
      )
      or (
        payment_schedule = 'twice_monthly'
        and payment_day_1 between 1 and 28
        and payment_day_2 between 1 and 28
        and payment_day_1 <> payment_day_2
      )
      or payment_schedule = 'on_demand'
    );

comment on column public.employees.payment_schedule is 'Employee payment schedule used to calculate the next payday and due state.';
comment on column public.employees.balance_starts_from is 'Running balance excludes attendance and advances before this date.';

alter table public.payroll_payments
  add column if not exists paid_on date;

update public.payroll_payments
set paid_on = coalesce(paid_on, created_at::date, current_date)
where paid_on is null;

alter table public.payroll_payments
  alter column paid_on set default current_date,
  alter column paid_on set not null,
  alter column period_start drop not null,
  alter column period_end drop not null;

alter table public.payroll_payments
  drop constraint if exists payroll_payments_period_shape_check,
  drop constraint if exists payroll_payments_period_bounds_check;

drop index if exists public.payroll_payments_employee_period_idx;
drop index if exists public.payroll_payments_unique_payroll;

comment on column public.payroll_payments.period_start is 'Legacy settlement coverage start date. Unused by running-balance payroll.';
comment on column public.payroll_payments.period_end is 'Legacy settlement coverage end date. Unused by running-balance payroll.';
comment on column public.payroll_payments.paid_on is 'Effective payment date for advances and payroll resets.';

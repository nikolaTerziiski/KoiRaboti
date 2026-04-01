alter table public.payroll_payments
  add column if not exists period_start date,
  add column if not exists period_end date;

update public.payroll_payments
set
  period_start = coalesce(
    period_start,
    case
      when payroll_period = 'first_half' then payroll_month
      else payroll_month + 15
    end
  ),
  period_end = coalesce(
    period_end,
    case
      when payroll_period = 'first_half' then payroll_month + 14
      else (date_trunc('month', payroll_month::timestamp) + interval '1 month - 1 day')::date
    end
  )
where period_start is null
   or period_end is null;

alter table public.payroll_payments
  alter column period_start set not null,
  alter column period_end set not null;

alter table public.payroll_payments
  drop constraint if exists payroll_payments_period_bounds_check;

alter table public.payroll_payments
  add constraint payroll_payments_period_bounds_check
  check (period_start <= period_end);

drop index if exists payroll_payments_employee_period_idx;
drop index if exists payroll_payments_unique_payroll;

create index if not exists payroll_payments_employee_created_idx
  on public.payroll_payments (employee_id, created_at desc);

create index if not exists payroll_payments_employee_period_idx
  on public.payroll_payments (employee_id, period_start, period_end);

create unique index if not exists payroll_payments_unique_payroll
  on public.payroll_payments (employee_id, period_start, period_end)
  where payment_type = 'payroll';

comment on column public.payroll_payments.period_start is 'Selected payroll window start date for the recorded transaction.';
comment on column public.payroll_payments.period_end is 'Selected payroll window end date for the recorded transaction.';

alter table public.payroll_payments
  drop column if exists payroll_month,
  drop column if exists payroll_period;

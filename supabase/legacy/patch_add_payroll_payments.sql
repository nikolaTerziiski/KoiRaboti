create table if not exists public.payroll_payments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  amount numeric(10, 4) not null check (amount >= 0),
  payment_type text not null check (payment_type in ('advance', 'payroll')),
  payroll_month date not null,
  payroll_period text not null check (payroll_period in ('first_half', 'second_half')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists payroll_payments_employee_period_idx
  on public.payroll_payments (employee_id, payroll_month, payroll_period);

create unique index if not exists payroll_payments_unique_payroll
  on public.payroll_payments (employee_id, payroll_month, payroll_period)
  where payment_type = 'payroll';

comment on column public.payroll_payments.amount is 'Stored in EUR. Used for payroll advances and payroll settlement records.';
comment on column public.payroll_payments.payment_type is 'Advance or payroll settlement.';
comment on column public.payroll_payments.payroll_month is 'Month key for the payroll period, stored as the first day of the month.';
comment on column public.payroll_payments.payroll_period is 'Payroll half-month period: first_half or second_half.';

alter table public.payroll_payments enable row level security;

drop policy if exists "restaurant members manage payroll payments" on public.payroll_payments;
create policy "restaurant members manage payroll payments"
  on public.payroll_payments
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.employees e
      where e.id = payroll_payments.employee_id
        and e.restaurant_id = get_user_restaurant_id()
    )
  )
  with check (
    exists (
      select 1
      from public.employees e
      where e.id = payroll_payments.employee_id
        and e.restaurant_id = get_user_restaurant_id()
    )
  );

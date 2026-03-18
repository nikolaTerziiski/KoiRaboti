create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_daily_expense numeric(12, 4) not null default 409.0335 check (default_daily_expense >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  full_name text not null,
  email text unique not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  role text not null default 'service' check (role in ('kitchen', 'service')),
  phone_number text,
  daily_rate numeric(10, 4) not null check (daily_rate >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists employees_restaurant_phone_unique
  on public.employees (restaurant_id, regexp_replace(phone_number, '\D', '', 'g'));

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  work_date date not null,
  turnover numeric(12, 4) not null default 0 check (turnover >= 0),
  profit numeric(12, 4) not null default 0 check (profit >= 0),
  card_amount numeric(12, 4) not null default 0 check (card_amount >= 0),
  manual_expense numeric(12, 4) not null default 409.0335 check (manual_expense >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (restaurant_id, work_date)
);

create table if not exists public.attendance_entries (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references public.daily_reports (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete restrict,
  pay_units numeric(3, 1) not null check (pay_units in (1, 1.5, 2)),
  pay_override numeric(10, 4),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (daily_report_id, employee_id)
);

create table if not exists public.payroll_payments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  amount numeric(10, 4) not null check (amount >= 0),
  payment_type text not null check (payment_type in ('advance', 'payroll')),
  payroll_month date not null,
  payroll_period text not null check (payroll_period in ('first_half', 'second_half')),
  created_at timestamptz not null default timezone('utc', now())
);

comment on column public.restaurants.default_daily_expense is 'Stored in EUR. Used as the initial manual_expense on daily reports.';
comment on column public.employees.daily_rate is 'Stored in EUR. The UI also shows BGN using the fixed rate 1.95583.';
comment on column public.employees.role is 'Employee role used for grouping and color-coding in the UI. Allowed values: kitchen or service.';
comment on column public.employees.phone_number is 'Optional. Stored as entered. Uniqueness is enforced on the normalised digits-only form per restaurant.';
comment on column public.daily_reports.turnover is 'Stored in EUR.';
comment on column public.daily_reports.profit is 'Stored in EUR.';
comment on column public.daily_reports.card_amount is 'Stored in EUR.';
comment on column public.daily_reports.manual_expense is 'Stored in EUR. Default equals 800 BGN at the fixed rate 1.95583.';
comment on column public.daily_reports.notes is 'Optional manager notes for the day.';
comment on column public.attendance_entries.pay_units is 'Number of paid shifts for the day: 1, 1.5, or 2.';
comment on column public.attendance_entries.pay_override is 'Optional custom EUR override for that day.';
comment on column public.attendance_entries.notes is 'Optional attendance note for the employee on that work date.';
comment on column public.payroll_payments.amount is 'Stored in EUR. Used for payroll advances and payroll settlement records.';
comment on column public.payroll_payments.payment_type is 'Advance or payroll settlement.';
comment on column public.payroll_payments.payroll_month is 'Month key for the payroll period, stored as the first day of the month.';
comment on column public.payroll_payments.payroll_period is 'Payroll half-month period: first_half or second_half.';

drop trigger if exists restaurants_set_updated_at on public.restaurants;
create trigger restaurants_set_updated_at
before update on public.restaurants
for each row
execute procedure public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute procedure public.set_updated_at();

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
before update on public.employees
for each row
execute procedure public.set_updated_at();

drop trigger if exists daily_reports_set_updated_at on public.daily_reports;
create trigger daily_reports_set_updated_at
before update on public.daily_reports
for each row
execute procedure public.set_updated_at();

drop trigger if exists attendance_entries_set_updated_at on public.attendance_entries;
create trigger attendance_entries_set_updated_at
before update on public.attendance_entries
for each row
execute procedure public.set_updated_at();

create index if not exists payroll_payments_employee_period_idx
  on public.payroll_payments (employee_id, payroll_month, payroll_period);

create unique index if not exists payroll_payments_unique_payroll
  on public.payroll_payments (employee_id, payroll_month, payroll_period)
  where payment_type = 'payroll';

create or replace function public.get_user_restaurant_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select restaurant_id from public.profiles where id = auth.uid()
$$;

create or replace function public.register_restaurant(
  p_user_id uuid,
  p_user_email text,
  p_restaurant_name text,
  p_admin_full_name text,
  p_default_daily_expense numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  insert into public.restaurants (name, default_daily_expense)
  values (p_restaurant_name, p_default_daily_expense)
  returning id into v_restaurant_id;

  insert into public.profiles (id, restaurant_id, full_name, email)
  values (p_user_id, v_restaurant_id, p_admin_full_name, p_user_email);

  return v_restaurant_id;
end;
$$;

grant execute on function public.register_restaurant(uuid, text, text, text, numeric)
  to anon, authenticated;

alter table public.restaurants enable row level security;
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.daily_reports enable row level security;
alter table public.attendance_entries enable row level security;
alter table public.payroll_payments enable row level security;

drop policy if exists "users see own restaurant" on public.restaurants;
create policy "users see own restaurant"
  on public.restaurants
  for select
  to authenticated
  using (id = get_user_restaurant_id());

drop policy if exists "users update own restaurant" on public.restaurants;
create policy "users update own restaurant"
  on public.restaurants
  for update
  to authenticated
  using (id = get_user_restaurant_id())
  with check (id = get_user_restaurant_id());

drop policy if exists "users see own profile" on public.profiles;
create policy "users see own profile"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "restaurant members manage employees" on public.employees;
create policy "restaurant members manage employees"
  on public.employees
  for all
  to authenticated
  using (restaurant_id = get_user_restaurant_id())
  with check (restaurant_id = get_user_restaurant_id());

drop policy if exists "restaurant members manage daily reports" on public.daily_reports;
create policy "restaurant members manage daily reports"
  on public.daily_reports
  for all
  to authenticated
  using (restaurant_id = get_user_restaurant_id())
  with check (restaurant_id = get_user_restaurant_id());

drop policy if exists "restaurant members manage attendance" on public.attendance_entries;
create policy "restaurant members manage attendance"
  on public.attendance_entries
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.daily_reports dr
      where dr.id = daily_report_id
        and dr.restaurant_id = get_user_restaurant_id()
    )
  )
  with check (
    exists (
      select 1
      from public.daily_reports dr
      where dr.id = daily_report_id
        and dr.restaurant_id = get_user_restaurant_id()
    )
  );

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



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

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text unique not null,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null,
  phone text,
  daily_rate numeric(10, 4) not null check (daily_rate >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  work_date date not null unique,
  turnover numeric(12, 4) not null default 0 check (turnover >= 0),
  profit numeric(12, 4) not null default 0 check (profit >= 0),
  card_amount numeric(12, 4) not null default 0 check (card_amount >= 0),
  manual_expense numeric(12, 4) not null default 409.0335 check (manual_expense >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attendance_entries (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references public.daily_reports (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete restrict,
  shift_1 boolean not null default false,
  shift_2 boolean not null default false,
  pay_units numeric(3, 1) not null check (pay_units in (1, 1.5, 2)),
  pay_override numeric(10, 4),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (daily_report_id, employee_id)
);

alter table if exists public.daily_reports
  add column if not exists notes text;

alter table if exists public.attendance_entries
  add column if not exists notes text;

alter table if exists public.daily_reports
  alter column manual_expense set default 409.0335;

comment on column public.employees.daily_rate is 'Stored in EUR. UI also shows BGN at the fixed rate 1.95583.';
comment on column public.daily_reports.turnover is 'Stored in EUR.';
comment on column public.daily_reports.profit is 'Stored in EUR.';
comment on column public.daily_reports.card_amount is 'Stored in EUR.';
comment on column public.daily_reports.manual_expense is 'Stored in EUR. Default equals 800 BGN at the fixed rate 1.95583.';
comment on column public.daily_reports.notes is 'Optional manager notes for the day.';
comment on column public.attendance_entries.pay_override is 'Stored in EUR.';
comment on column public.attendance_entries.notes is 'Optional attendance note for the employee on that work date.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute procedure public.set_updated_at();

create trigger employees_set_updated_at
before update on public.employees
for each row
execute procedure public.set_updated_at();

create trigger daily_reports_set_updated_at
before update on public.daily_reports
for each row
execute procedure public.set_updated_at();

create trigger attendance_entries_set_updated_at
before update on public.attendance_entries
for each row
execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.daily_reports enable row level security;
alter table public.attendance_entries enable row level security;

create policy "authenticated can read profiles"
on public.profiles
for select
to authenticated
using (true);

create policy "authenticated can manage employees"
on public.employees
for all
to authenticated
using (true)
with check (true);

create policy "authenticated can manage daily reports"
on public.daily_reports
for all
to authenticated
using (true)
with check (true);

create policy "authenticated can manage attendance"
on public.attendance_entries
for all
to authenticated
using (true)
with check (true);

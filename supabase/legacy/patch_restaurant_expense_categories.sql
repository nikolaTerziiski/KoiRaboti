-- =============================================================================
-- Restaurant-scoped expenses + Telegram ops copilot bridge
-- Makes restaurants the canonical tenant while preserving legacy Telegram data
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Legacy bot tables kept for migration compatibility
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_currency text not null default 'BGN',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.telegram_users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  business_id uuid references public.businesses(id) on delete set null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  first_name text,
  last_name text,
  username text,
  language_code text not null default 'bg',
  is_admin boolean not null default false,
  chat_id bigint,
  linked_at timestamptz,
  last_seen_at timestamptz,
  daily_summary_enabled boolean not null default true,
  summary_timezone text not null default 'Europe/Sofia',
  summary_hour integer not null default 19 check (summary_hour between 0 and 23),
  last_summary_sent_on date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.telegram_users add column if not exists business_id uuid references public.businesses(id) on delete set null;
alter table public.telegram_users add column if not exists restaurant_id uuid references public.restaurants(id) on delete set null;
alter table public.telegram_users add column if not exists chat_id bigint;
alter table public.telegram_users add column if not exists linked_at timestamptz;
alter table public.telegram_users add column if not exists last_seen_at timestamptz;
alter table public.telegram_users add column if not exists daily_summary_enabled boolean not null default true;
alter table public.telegram_users add column if not exists summary_timezone text not null default 'Europe/Sofia';
alter table public.telegram_users add column if not exists summary_hour integer not null default 19;
alter table public.telegram_users add column if not exists last_summary_sent_on date;

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  emoji text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, name)
);

create table if not exists public.operational_expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid references public.expense_categories(id) on delete set null,
  telegram_user_id uuid references public.telegram_users(id) on delete set null,
  amount numeric(12, 4) not null check (amount >= 0),
  currency text not null default 'EUR',
  amount_original numeric(12, 4) not null check (amount_original >= 0),
  currency_original text not null default 'BGN',
  description text,
  receipt_image_path text,
  expense_date date not null default current_date,
  source_type text not null default 'telegram' check (source_type in ('telegram', 'web', 'api')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_restaurant_links (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  restaurant_id uuid not null unique references public.restaurants(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.business_restaurant_links is 'Bridges legacy Telegram businesses to canonical restaurants.';

-- ---------------------------------------------------------------------------
-- 2. Restaurant-level categories and shared daily expense ledger
-- ---------------------------------------------------------------------------
create table if not exists public.restaurant_expense_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  emoji text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (restaurant_id, name)
);

create table if not exists public.daily_expense_items (
  id uuid primary key default gen_random_uuid(),
  legacy_operational_expense_id uuid unique references public.operational_expenses(id) on delete set null,
  daily_report_id uuid not null references public.daily_reports(id) on delete cascade,
  category_id uuid references public.restaurant_expense_categories(id) on delete set null,
  amount numeric(12, 4) not null check (amount >= 0),
  amount_original numeric(12, 4),
  currency_original text,
  description text,
  receipt_image_path text,
  receipt_ocr_text text,
  source_type text not null default 'web' check (source_type in ('telegram', 'web')),
  telegram_user_id uuid references public.telegram_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.daily_expense_items add column if not exists legacy_operational_expense_id uuid unique references public.operational_expenses(id) on delete set null;
alter table public.daily_expense_items add column if not exists amount_original numeric(12, 4);
alter table public.daily_expense_items add column if not exists currency_original text;
alter table public.daily_expense_items add column if not exists receipt_image_path text;
alter table public.daily_expense_items add column if not exists receipt_ocr_text text;
alter table public.daily_expense_items add column if not exists source_type text not null default 'web';
alter table public.daily_expense_items add column if not exists telegram_user_id uuid references public.telegram_users(id) on delete set null;
alter table public.daily_expense_items add column if not exists updated_at timestamptz not null default timezone('utc', now());

create index if not exists daily_expense_items_report_idx
  on public.daily_expense_items (daily_report_id);

create index if not exists daily_expense_items_telegram_user_idx
  on public.daily_expense_items (telegram_user_id);

-- ---------------------------------------------------------------------------
-- 3. Telegram connect tokens + AI context chunks
-- ---------------------------------------------------------------------------
create table if not exists public.telegram_connect_tokens (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claimed_by_telegram_user_id uuid references public.telegram_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists telegram_connect_tokens_restaurant_idx
  on public.telegram_connect_tokens (restaurant_id, created_at desc);

create table if not exists public.telegram_ai_context_chunks (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  chunk_text text not null,
  freshness_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (source_type, source_id)
);

create index if not exists telegram_ai_context_chunks_restaurant_idx
  on public.telegram_ai_context_chunks (restaurant_id, freshness_at desc);

-- ---------------------------------------------------------------------------
-- 4. Seed default restaurant categories
-- ---------------------------------------------------------------------------
create or replace function public.seed_restaurant_expense_categories(p_restaurant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.restaurant_expense_categories (restaurant_id, name, emoji) values
    (p_restaurant_id, 'Храна и продукти', '🛒'),
    (p_restaurant_id, 'Напитки',          '🍷'),
    (p_restaurant_id, 'Комунални',        '💡'),
    (p_restaurant_id, 'Наем',             '🏠'),
    (p_restaurant_id, 'Поддръжка',        '🔧'),
    (p_restaurant_id, 'Консумативи',      '📎'),
    (p_restaurant_id, 'Транспорт',        '🚗'),
    (p_restaurant_id, 'Други',            '📦')
  on conflict (restaurant_id, name) do nothing;
end;
$$;

create or replace function public.seed_default_categories(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.expense_categories (business_id, name, emoji) values
    (p_business_id, 'Храна и продукти', '🛒'),
    (p_business_id, 'Напитки',          '🍷'),
    (p_business_id, 'Комунални',        '💡'),
    (p_business_id, 'Наем',             '🏠'),
    (p_business_id, 'Поддръжка',        '🔧'),
    (p_business_id, 'Консумативи',      '📎'),
    (p_business_id, 'Транспорт',        '🚗'),
    (p_business_id, 'Други',            '📦')
  on conflict (business_id, name) do nothing;
end;
$$;

comment on function public.seed_restaurant_expense_categories(uuid) is 'Seeds default expense categories for a restaurant.';
comment on function public.seed_default_categories(uuid) is 'Seeds default legacy Telegram expense categories for a business.';

-- ---------------------------------------------------------------------------
-- 5. Keep manual_expense derived from daily_expense_items
-- ---------------------------------------------------------------------------
create or replace function public.sync_daily_report_manual_expense_from_items()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_daily_report_id uuid;
begin
  v_daily_report_id := coalesce(new.daily_report_id, old.daily_report_id);

  update public.daily_reports
  set manual_expense = coalesce((
    select sum(amount)
    from public.daily_expense_items
    where daily_report_id = v_daily_report_id
  ), 0)
  where id = v_daily_report_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists daily_expense_items_set_updated_at on public.daily_expense_items;
create trigger daily_expense_items_set_updated_at
before update on public.daily_expense_items
for each row
execute procedure public.set_updated_at();

drop trigger if exists daily_expense_items_sync_manual_expense on public.daily_expense_items;
create trigger daily_expense_items_sync_manual_expense
after insert or update or delete on public.daily_expense_items
for each row
execute procedure public.sync_daily_report_manual_expense_from_items();

-- ---------------------------------------------------------------------------
-- 6. Update register_restaurant to also seed expense categories
-- ---------------------------------------------------------------------------
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

  perform public.seed_restaurant_expense_categories(v_restaurant_id);

  return v_restaurant_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Migrate legacy Telegram data into restaurant-scoped structures
-- ---------------------------------------------------------------------------
do $$
declare
  v_business record;
  v_restaurant_id uuid;
begin
  for v_business in
    select b.id, b.name
    from public.businesses b
    left join public.business_restaurant_links brl on brl.business_id = b.id
    where brl.business_id is null
  loop
    insert into public.restaurants (name)
    values (coalesce(nullif(trim(v_business.name), ''), 'Migrated business'))
    returning id into v_restaurant_id;

    insert into public.business_restaurant_links (business_id, restaurant_id)
    values (v_business.id, v_restaurant_id)
    on conflict (business_id) do nothing;

    perform public.seed_restaurant_expense_categories(v_restaurant_id);
  end loop;
end;
$$;

update public.telegram_users tu
set
  restaurant_id = brl.restaurant_id,
  linked_at = coalesce(tu.linked_at, timezone('utc', now())),
  last_seen_at = coalesce(tu.last_seen_at, timezone('utc', now()))
from public.business_restaurant_links brl
where tu.business_id = brl.business_id
  and tu.restaurant_id is distinct from brl.restaurant_id;

insert into public.restaurant_expense_categories (restaurant_id, name, emoji, is_active)
select
  brl.restaurant_id,
  ec.name,
  ec.emoji,
  ec.is_active
from public.expense_categories ec
join public.business_restaurant_links brl on brl.business_id = ec.business_id
on conflict (restaurant_id, name) do update
set
  emoji = coalesce(excluded.emoji, public.restaurant_expense_categories.emoji),
  is_active = excluded.is_active;

insert into public.daily_reports (restaurant_id, work_date, manual_expense)
select distinct
  brl.restaurant_id,
  oe.expense_date,
  0
from public.operational_expenses oe
join public.business_restaurant_links brl on brl.business_id = oe.business_id
on conflict (restaurant_id, work_date) do nothing;

insert into public.daily_expense_items (
  legacy_operational_expense_id,
  daily_report_id,
  category_id,
  amount,
  amount_original,
  currency_original,
  description,
  receipt_image_path,
  source_type,
  telegram_user_id,
  created_at,
  updated_at
)
select
  oe.id,
  dr.id,
  rec.id,
  oe.amount,
  oe.amount_original,
  oe.currency_original,
  oe.description,
  oe.receipt_image_path,
  case when oe.source_type = 'web' then 'web' else 'telegram' end,
  oe.telegram_user_id,
  oe.created_at,
  oe.updated_at
from public.operational_expenses oe
join public.business_restaurant_links brl on brl.business_id = oe.business_id
join public.daily_reports dr
  on dr.restaurant_id = brl.restaurant_id
 and dr.work_date = oe.expense_date
left join public.expense_categories legacy_cat on legacy_cat.id = oe.category_id
left join public.restaurant_expense_categories rec
  on rec.restaurant_id = brl.restaurant_id
 and rec.name = legacy_cat.name
where not exists (
  select 1
  from public.daily_expense_items dei
  where dei.legacy_operational_expense_id = oe.id
);

insert into public.telegram_ai_context_chunks (restaurant_id, source_type, source_id, chunk_text, freshness_at)
select
  dr.restaurant_id,
  'daily_report',
  dr.id::text,
  dr.notes,
  coalesce(dr.updated_at, dr.created_at)
from public.daily_reports dr
where dr.notes is not null
  and btrim(dr.notes) <> ''
on conflict (source_type, source_id) do update
set
  chunk_text = excluded.chunk_text,
  freshness_at = excluded.freshness_at;

insert into public.telegram_ai_context_chunks (restaurant_id, source_type, source_id, chunk_text, freshness_at)
select
  brl.restaurant_id,
  'expense_item',
  oe.id::text,
  concat_ws(E'\n', oe.description, nullif(oe.receipt_image_path, '')),
  coalesce(oe.updated_at, oe.created_at)
from public.operational_expenses oe
join public.business_restaurant_links brl on brl.business_id = oe.business_id
where coalesce(nullif(btrim(oe.description), ''), nullif(btrim(oe.receipt_image_path), '')) is not null
on conflict (source_type, source_id) do update
set
  chunk_text = excluded.chunk_text,
  freshness_at = excluded.freshness_at;

update public.daily_reports dr
set manual_expense = coalesce((
  select sum(dei.amount)
  from public.daily_expense_items dei
  where dei.daily_report_id = dr.id
), 0)
where exists (
  select 1
  from public.daily_expense_items dei
  where dei.daily_report_id = dr.id
);

-- ---------------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------------
alter table public.businesses enable row level security;
alter table public.telegram_users enable row level security;
alter table public.expense_categories enable row level security;
alter table public.operational_expenses enable row level security;
alter table public.restaurant_expense_categories enable row level security;
alter table public.daily_expense_items enable row level security;
alter table public.telegram_connect_tokens enable row level security;
alter table public.telegram_ai_context_chunks enable row level security;

drop policy if exists "deny anon on businesses" on public.businesses;
create policy "deny anon on businesses"
  on public.businesses for all to anon using (false);

drop policy if exists "deny anon on telegram_users" on public.telegram_users;
create policy "deny anon on telegram_users"
  on public.telegram_users for all to anon using (false);

drop policy if exists "deny anon on expense_categories" on public.expense_categories;
create policy "deny anon on expense_categories"
  on public.expense_categories for all to anon using (false);

drop policy if exists "deny anon on operational_expenses" on public.operational_expenses;
create policy "deny anon on operational_expenses"
  on public.operational_expenses for all to anon using (false);

drop policy if exists "restaurant members manage expense categories" on public.restaurant_expense_categories;
create policy "restaurant members manage expense categories"
  on public.restaurant_expense_categories
  for all
  to authenticated
  using (restaurant_id = get_user_restaurant_id())
  with check (restaurant_id = get_user_restaurant_id());

drop policy if exists "restaurant members manage expense items" on public.daily_expense_items;
create policy "restaurant members manage expense items"
  on public.daily_expense_items
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

drop policy if exists "restaurant members manage telegram connect tokens" on public.telegram_connect_tokens;
create policy "restaurant members manage telegram connect tokens"
  on public.telegram_connect_tokens
  for all
  to authenticated
  using (restaurant_id = get_user_restaurant_id())
  with check (restaurant_id = get_user_restaurant_id());

drop policy if exists "restaurant members manage ai context" on public.telegram_ai_context_chunks;
create policy "restaurant members manage ai context"
  on public.telegram_ai_context_chunks
  for all
  to authenticated
  using (restaurant_id = get_user_restaurant_id())
  with check (restaurant_id = get_user_restaurant_id());

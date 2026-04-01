-- =============================================================================
-- Expense Bot: businesses, telegram_users, expense_categories
-- Rewrites operational_expenses to be properly linked
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. businesses  (standalone multi-tenant anchor, independent of restaurants)
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_currency text not null default 'BGN',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table  public.businesses is 'Generic business entity for Telegram expense tracking. Independent of the restaurants table.';
comment on column public.businesses.default_currency is 'Default input currency for the business (BGN, EUR). Storage is always EUR.';

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row
execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. telegram_users  (links a Telegram account to a business)
-- ---------------------------------------------------------------------------
create table if not exists public.telegram_users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  business_id uuid references public.businesses(id) on delete set null,
  first_name text,
  last_name text,
  username text,
  language_code text not null default 'bg',
  is_admin boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table  public.telegram_users is 'Maps Telegram accounts to businesses. business_id is null during onboarding.';
comment on column public.telegram_users.telegram_id is 'Telegram user ID (stable numeric identifier from Telegram API).';
comment on column public.telegram_users.is_admin is 'Can manage categories and business settings via the bot.';

drop trigger if exists telegram_users_set_updated_at on public.telegram_users;
create trigger telegram_users_set_updated_at
before update on public.telegram_users
for each row
execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. expense_categories  (per-business custom categories)
-- ---------------------------------------------------------------------------
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  emoji text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, name)
);

comment on table  public.expense_categories is 'Per-business expense categories. Seeded with defaults on business creation.';
comment on column public.expense_categories.emoji is 'Optional emoji for display in Telegram inline buttons.';

-- ---------------------------------------------------------------------------
-- 4. Rewrite operational_expenses
--    Drop the old test table and recreate with proper structure
-- ---------------------------------------------------------------------------
drop table if exists public.operational_expenses;

create table public.operational_expenses (
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

comment on table  public.operational_expenses is 'Expense records created via Telegram bot, web UI, or API.';
comment on column public.operational_expenses.amount is 'Stored in EUR. Converted from amount_original using the fixed rate.';
comment on column public.operational_expenses.amount_original is 'Original amount as entered by the user.';
comment on column public.operational_expenses.currency_original is 'Currency of the original amount (BGN or EUR).';
comment on column public.operational_expenses.receipt_image_path is 'Supabase Storage path for receipt photo, if uploaded.';
comment on column public.operational_expenses.source_type is 'How the expense was created: telegram, web, or api.';

create index if not exists operational_expenses_business_date_idx
  on public.operational_expenses (business_id, expense_date desc);

create index if not exists operational_expenses_category_idx
  on public.operational_expenses (category_id);

drop trigger if exists operational_expenses_set_updated_at on public.operational_expenses;
create trigger operational_expenses_set_updated_at
before update on public.operational_expenses
for each row
execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Seed default categories function
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_categories(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.expense_categories (business_id, name, emoji) values
    (p_business_id, 'Храна и продукти', '🛒'),
    (p_business_id, 'Гориво',           '⛽'),
    (p_business_id, 'Комунални',        '💡'),
    (p_business_id, 'Наем',             '🏠'),
    (p_business_id, 'Заплати',          '💰'),
    (p_business_id, 'Поддръжка',        '🔧'),
    (p_business_id, 'Транспорт',        '🚗'),
    (p_business_id, 'Консумативи',      '📎'),
    (p_business_id, 'Други',            '📦')
  on conflict (business_id, name) do nothing;
end;
$$;

comment on function public.seed_default_categories(uuid) is 'Seeds default Bulgarian expense categories for a new business.';

-- ---------------------------------------------------------------------------
-- 6. RLS  (service role bypasses, but deny anon for defense-in-depth)
-- ---------------------------------------------------------------------------
alter table public.businesses enable row level security;
alter table public.telegram_users enable row level security;
alter table public.expense_categories enable row level security;
alter table public.operational_expenses enable row level security;

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

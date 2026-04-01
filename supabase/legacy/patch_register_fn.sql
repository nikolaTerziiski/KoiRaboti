-- Patch: replace register_restaurant to accept explicit user_id and email
-- (fixes auth.uid() = null when email confirmation is enabled in Supabase)

drop function if exists public.register_restaurant(text, text, numeric);

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

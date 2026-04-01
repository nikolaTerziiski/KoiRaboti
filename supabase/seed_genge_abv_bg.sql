-- Ready-to-run sandbox seed for the existing test account.
-- Run supabase/seed_large.sql first, then run this file.

select public.seed_koi_raboti_sandbox(
  p_user_id := 'b6233384-da40-4423-aacb-45afc696db95'::uuid,
  p_user_email := 'genge@abv.bg',
  p_restaurant_name := 'Admin Test Sandbox',
  p_admin_full_name := 'Никола Терзийски',
  p_months := 12,
  p_employee_count := 30,
  p_replace_existing_data := false
);

-- Disable Telegram summary sending for the sandbox tenant in the live project.
update public.telegram_users
set
  daily_summary_enabled = false,
  chat_id = null
where restaurant_id = (
  select restaurant_id
  from public.profiles
  where id = 'b6233384-da40-4423-aacb-45afc696db95'::uuid
);

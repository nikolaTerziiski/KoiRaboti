-- Cleanup for the sandbox tenant created for genge@abv.bg.
-- Run this before deleting the auth user from Supabase Authentication.

delete from public.restaurants
where id = (
  select restaurant_id
  from public.profiles
  where id = 'b6233384-da40-4423-aacb-45afc696db95'::uuid
);

-- After the delete above, remove the auth user from Supabase Authentication UI.
-- The profile row will already be gone because it cascades from public.restaurants.

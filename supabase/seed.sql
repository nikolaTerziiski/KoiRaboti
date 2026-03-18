-- Demo restaurant with a fixed UUID so employees can reference it
insert into public.restaurants (id, name, default_daily_expense)
values ('00000000-0000-0000-0000-000000000001', 'Demo Restaurant', 409.0335)
on conflict (id) do nothing;

insert into public.employees (restaurant_id, first_name, last_name, role, phone_number, daily_rate)
values
  ('00000000-0000-0000-0000-000000000001', 'Ivan',     'Petrov',    'kitchen', '+359 888 100 001', 56.2421),
  ('00000000-0000-0000-0000-000000000001', 'Maria',    'Georgieva', 'service', '+359 888 100 002', 46.0163),
  ('00000000-0000-0000-0000-000000000001', 'Nikolay',  'Dimitrov',  'kitchen', '+359 888 100 003', 53.6856),
  ('00000000-0000-0000-0000-000000000001', 'Elena',    'Stoyanova', 'service', '+359 888 100 004', 44.9937),
  ('00000000-0000-0000-0000-000000000001', 'Georgi',   'Iliev',     'kitchen', '+359 888 100 005', 47.0389),
  ('00000000-0000-0000-0000-000000000001', 'Petya',    'Ivanova',   'service', '+359 888 100 006', 43.4598),
  ('00000000-0000-0000-0000-000000000001', 'Stoyan',   'Kolev',     'kitchen', '+359 888 100 007', 44.4824),
  ('00000000-0000-0000-0000-000000000001', 'Ralitsa',  'Hristova',  'service', '+359 888 100 008', 46.0163),
  ('00000000-0000-0000-0000-000000000001', 'Dimitar',  'Yordanov',  'service', '+359 888 100 009', 40.9034),
  ('00000000-0000-0000-0000-000000000001', 'Teodora',  'Marinova',  'kitchen', '+359 888 100 010', 61.3550);


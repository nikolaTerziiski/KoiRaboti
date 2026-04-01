-- KoiRaboti sandbox helpers and large realistic seed generator.
--
-- Recommended workflow for an empty backup project:
-- 1. Create one auth user in Supabase Auth.
-- 2. Run:
--      supabase/schema_current.sql
--      supabase/seed_large.sql
-- 3. Call:
--      select public.seed_koi_raboti_sandbox(
--        p_user_id := 'b6233384-da40-4423-aacb-45afc696db95',
--        p_user_email := 'genge@abv.bg',
--        p_restaurant_name := 'Admin Test Sandbox',
--        p_admin_full_name := 'Никола Терзийски',
--        p_months := 12,
--        p_employee_count := 30,
--        p_replace_existing_data := false
--      );
--
-- If you restore app data without profiles into a backup project, you can attach
-- your new auth user to an existing restaurant with:
--   select public.attach_user_to_restaurant(
--     p_user_id := 'YOUR_AUTH_USER_UUID',
--     p_user_email := 'owner@example.com',
--     p_full_name := 'Sandbox Owner',
--     p_restaurant_id := 'RESTAURANT_UUID',
--     p_force_move := true
--   );

create or replace function public.attach_user_to_restaurant(
  p_user_id uuid,
  p_user_email text,
  p_full_name text,
  p_restaurant_id uuid,
  p_force_move boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_restaurant_id uuid;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required.';
  end if;

  if p_restaurant_id is null then
    raise exception 'p_restaurant_id is required.';
  end if;

  if not exists (
    select 1
    from public.restaurants
    where id = p_restaurant_id
  ) then
    raise exception 'Restaurant % does not exist.', p_restaurant_id;
  end if;

  select restaurant_id
  into v_existing_restaurant_id
  from public.profiles
  where id = p_user_id;

  if v_existing_restaurant_id is not null
    and v_existing_restaurant_id <> p_restaurant_id
    and not p_force_move then
    raise exception
      'User % is already attached to restaurant %. Pass p_force_move := true to reassign.',
      p_user_id,
      v_existing_restaurant_id;
  end if;

  insert into public.profiles (id, restaurant_id, full_name, email)
  values (
    p_user_id,
    p_restaurant_id,
    coalesce(nullif(trim(p_full_name), ''), 'Sandbox Owner'),
    coalesce(nullif(trim(p_user_email), ''), 'sandbox@example.com')
  )
  on conflict (id) do update
  set
    restaurant_id = excluded.restaurant_id,
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = timezone('utc', now());

  return p_restaurant_id;
end;
$$;

comment on function public.attach_user_to_restaurant(uuid, text, text, uuid, boolean)
  is 'Attaches a Supabase auth user to an existing KoiRaboti restaurant profile.';

create or replace function public.seed_koi_raboti_sandbox(
  p_user_id uuid,
  p_user_email text,
  p_restaurant_name text default 'Koi Raboti Sandbox',
  p_admin_full_name text default 'Sandbox Owner',
  p_months integer default 6,
  p_employee_count integer default 18,
  p_replace_existing_data boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_business_id uuid;
  v_existing_restaurant_id uuid;
  v_primary_telegram_user_id uuid;
  v_linked_business_ids uuid[];
  v_report_id uuid;
  v_operational_expense_id uuid;
  v_restaurant_category_ids uuid[];
  v_business_category_ids uuid[];
  v_day date;
  v_start_date date;
  v_end_date date := current_date;
  v_note text;
  v_turnover_bgn numeric(12, 4);
  v_turnover_eur numeric(12, 4);
  v_card_ratio numeric(8, 4);
  v_card_amount_eur numeric(12, 4);
  v_profit_ratio numeric(8, 4);
  v_profit_eur numeric(12, 4);
  v_weekday integer;
  v_employee_first_names text[] := array[
    'Ivan', 'Maria', 'Nikolay', 'Elena', 'Georgi', 'Petya',
    'Stoyan', 'Ralitsa', 'Dimitar', 'Teodora', 'Viktor', 'Kristina',
    'Martin', 'Yana', 'Borislav', 'Desislava', 'Kaloyan', 'Miglena',
    'Plamen', 'Simeon', 'Nadezhda', 'Todor', 'Raya', 'Krasimir'
  ];
  v_employee_last_names text[] := array[
    'Petrov', 'Georgieva', 'Dimitrov', 'Stoyanova', 'Iliev', 'Ivanova',
    'Kolev', 'Hristova', 'Yordanov', 'Marinova', 'Todorov', 'Pavlova',
    'Nikolov', 'Asenova', 'Vasilev', 'Dobreva', 'Rusev', 'Angelova',
    'Mihaylov', 'Kostova', 'Atanasov', 'Bogdanova', 'Velikov', 'Slavova'
  ];
  v_telegram_first_names text[] := array['Mira', 'Pavel', 'Nina'];
  v_telegram_last_names text[] := array['Ops', 'Supply', 'Manager'];
  v_item_descriptions text[] := array[
    'Produce restock',
    'Utilities and services',
    'Cleaning and disposables',
    'Delivery packaging',
    'Drinks refill',
    'Maintenance visit',
    'Transport and courier',
    'Office and admin supplies'
  ];
  v_employee record;
  v_period record;
  v_employee_index integer;
  v_employee_is_present boolean;
  v_pay_units numeric(3, 1);
  v_pay_override numeric(10, 4);
  v_attendance_note text;
  v_daily_rate_bgn numeric(10, 4);
  v_daily_rate_eur numeric(10, 4);
  v_employee_count integer;
  v_expense_count integer;
  v_expense_index integer;
  v_category_slot integer;
  v_business_category_slot integer;
  v_amount_original_bgn numeric(12, 4);
  v_amount_eur numeric(12, 4);
  v_is_telegram_expense boolean;
  v_selected_telegram_user_id uuid;
  v_description text;
  v_receipt_path text;
  v_receipt_ocr text;
  v_created_at timestamptz;
  v_advance_total numeric(12, 4);
  v_advance_amount numeric(12, 4);
  v_net_amount numeric(12, 4);
  v_eur_bgn_rate constant numeric(12, 5) := 1.95583;
  v_default_daily_expense constant numeric(12, 4) := 409.0335;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required.';
  end if;

  if p_months < 1 or p_months > 24 then
    raise exception 'p_months must be between 1 and 24.';
  end if;

  if p_employee_count < 6 or p_employee_count > 40 then
    raise exception 'p_employee_count must be between 6 and 40.';
  end if;

  v_start_date := date_trunc(
    'month',
    current_date - make_interval(months => greatest(p_months - 1, 0))
  )::date;

  select restaurant_id
  into v_existing_restaurant_id
  from public.profiles
  where id = p_user_id;

  if v_existing_restaurant_id is null then
    select public.register_restaurant(
      p_user_id,
      coalesce(nullif(trim(p_user_email), ''), 'sandbox@example.com'),
      coalesce(nullif(trim(p_restaurant_name), ''), 'Koi Raboti Sandbox'),
      coalesce(nullif(trim(p_admin_full_name), ''), 'Sandbox Owner'),
      v_default_daily_expense,
      'monthly',
      5,
      1,
      15,
      30
    )
    into v_restaurant_id;
  else
    v_restaurant_id := v_existing_restaurant_id;

    if exists (
      select 1
      from public.employees
      where restaurant_id = v_restaurant_id
    )
    or exists (
      select 1
      from public.daily_reports
      where restaurant_id = v_restaurant_id
    )
    or exists (
      select 1
      from public.telegram_users
      where restaurant_id = v_restaurant_id
    ) then
      if not p_replace_existing_data then
        raise exception
          'Restaurant % already has data. Re-run with p_replace_existing_data := true only in a disposable backup DB.',
          v_restaurant_id;
      end if;
    end if;

    select coalesce(array_agg(distinct business_id), '{}')
    into v_linked_business_ids
    from (
      select business_id
      from public.business_restaurant_links
      where restaurant_id = v_restaurant_id
      union
      select business_id
      from public.telegram_users
      where restaurant_id = v_restaurant_id
        and business_id is not null
    ) linked;

    delete from public.payroll_payments
    where employee_id in (
      select id
      from public.employees
      where restaurant_id = v_restaurant_id
    );

    delete from public.attendance_entries
    where daily_report_id in (
      select id
      from public.daily_reports
      where restaurant_id = v_restaurant_id
    );

    delete from public.daily_expense_items
    where daily_report_id in (
      select id
      from public.daily_reports
      where restaurant_id = v_restaurant_id
    );

    delete from public.daily_reports
    where restaurant_id = v_restaurant_id;

    delete from public.telegram_ai_context_chunks
    where restaurant_id = v_restaurant_id;

    delete from public.telegram_connect_tokens
    where restaurant_id = v_restaurant_id;

    delete from public.employees
    where restaurant_id = v_restaurant_id;

    delete from public.restaurant_expense_categories
    where restaurant_id = v_restaurant_id;

    delete from public.telegram_users
    where restaurant_id = v_restaurant_id
      or (
        cardinality(v_linked_business_ids) > 0
        and business_id = any(v_linked_business_ids)
      );

    delete from public.business_restaurant_links
    where restaurant_id = v_restaurant_id;

    if cardinality(v_linked_business_ids) > 0 then
      delete from public.businesses
      where id = any(v_linked_business_ids);
    end if;

    update public.restaurants
    set
      name = coalesce(nullif(trim(p_restaurant_name), ''), name),
      default_daily_expense = v_default_daily_expense,
      default_payroll_cadence = 'monthly',
      default_weekly_payday = 5,
      default_monthly_pay_day = 1,
      default_twice_monthly_day_1 = 15,
      default_twice_monthly_day_2 = 30,
      updated_at = timezone('utc', now())
    where id = v_restaurant_id;

    update public.profiles
    set
      full_name = coalesce(nullif(trim(p_admin_full_name), ''), full_name),
      email = coalesce(nullif(trim(p_user_email), ''), email),
      updated_at = timezone('utc', now())
    where id = p_user_id;

    perform public.seed_restaurant_expense_categories(v_restaurant_id);
  end if;

  insert into public.businesses (name, default_currency)
  values (
    format('%s Operations', coalesce(nullif(trim(p_restaurant_name), ''), 'Koi Raboti Sandbox')),
    'BGN'
  )
  returning id into v_business_id;

  insert into public.business_restaurant_links (business_id, restaurant_id)
  values (v_business_id, v_restaurant_id)
  on conflict (restaurant_id) do update
  set business_id = excluded.business_id;

  perform public.seed_default_categories(v_business_id);

  for v_employee_index in 1..3 loop
    insert into public.telegram_users (
      telegram_id,
      business_id,
      restaurant_id,
      first_name,
      last_name,
      username,
      language_code,
      is_admin,
      chat_id,
      linked_at,
      last_seen_at,
      daily_summary_enabled,
      summary_timezone,
      summary_hour,
      last_summary_sent_on
    )
    values (
      780000000 + v_employee_index + (extract(day from current_date)::bigint * 10),
      v_business_id,
      v_restaurant_id,
      v_telegram_first_names[v_employee_index],
      v_telegram_last_names[v_employee_index],
      lower(v_telegram_first_names[v_employee_index] || '_' || v_telegram_last_names[v_employee_index]),
      case when mod(v_employee_index, 2) = 0 then 'en' else 'bg' end,
      v_employee_index = 1,
      970000000 + v_employee_index + (extract(day from current_date)::bigint * 10),
      timezone('utc', now()) - make_interval(days => v_employee_index * 3),
      timezone('utc', now()) - make_interval(hours => v_employee_index * 5),
      true,
      'Europe/Sofia',
      19,
      current_date - v_employee_index
    );
  end loop;

  select id
  into v_primary_telegram_user_id
  from public.telegram_users
  where restaurant_id = v_restaurant_id
  order by is_admin desc, created_at
  limit 1;

  insert into public.telegram_connect_tokens (
    restaurant_id,
    token,
    expires_at,
    claimed_at,
    claimed_by_telegram_user_id
  )
  values
    (
      v_restaurant_id,
      md5(random()::text || clock_timestamp()::text || v_restaurant_id::text || 'token-1'),
      timezone('utc', now()) + interval '7 days',
      null,
      null
    ),
    (
      v_restaurant_id,
      md5(random()::text || clock_timestamp()::text || v_restaurant_id::text || 'token-2'),
      timezone('utc', now()) + interval '2 days',
      timezone('utc', now()) - interval '1 day',
      v_primary_telegram_user_id
    ),
    (
      v_restaurant_id,
      md5(random()::text || clock_timestamp()::text || v_restaurant_id::text || 'token-3'),
      timezone('utc', now()) - interval '2 days',
      null,
      null
    );

  v_employee_count := greatest(p_employee_count, 6);

  for v_employee_index in 1..v_employee_count loop
    v_daily_rate_bgn :=
      case
        when mod(v_employee_index, 2) = 1 then 100 + ((v_employee_index - 1) % 6) * 6
        else 84 + ((v_employee_index - 1) % 5) * 5
      end;
    v_daily_rate_eur := round(v_daily_rate_bgn / v_eur_bgn_rate, 4);

    insert into public.employees (
      restaurant_id,
      first_name,
      last_name,
      role,
      phone_number,
      daily_rate,
      is_active,
      use_restaurant_payroll_defaults,
      payroll_cadence,
      weekly_payday,
      monthly_pay_day,
      twice_monthly_day_1,
      twice_monthly_day_2
    )
    values (
      v_restaurant_id,
      v_employee_first_names[((v_employee_index - 1) % cardinality(v_employee_first_names)) + 1],
      v_employee_last_names[((v_employee_index - 1) % cardinality(v_employee_last_names)) + 1],
      case when mod(v_employee_index, 2) = 1 then 'kitchen' else 'service' end,
      case when mod(v_employee_index, 4) = 0 then null else format('+359 888 21%04s', v_employee_index) end,
      v_daily_rate_eur,
      v_employee_index <= v_employee_count - 2,
      not (
        mod(v_employee_index, 6) = 0
        or mod(v_employee_index, 5) = 0
        or mod(v_employee_index, 7) = 0
      ),
      case
        when mod(v_employee_index, 6) = 0 then 'daily'
        when mod(v_employee_index, 5) = 0 then 'weekly'
        when mod(v_employee_index, 7) = 0 then 'twice_monthly'
        else null
      end,
      case when mod(v_employee_index, 5) = 0 then 5 else null end,
      null,
      case when mod(v_employee_index, 7) = 0 then 15 else null end,
      case when mod(v_employee_index, 7) = 0 then 30 else null end
    );
  end loop;

  perform public.seed_restaurant_expense_categories(v_restaurant_id);

  select array_agg(id order by name)
  into v_restaurant_category_ids
  from public.restaurant_expense_categories
  where restaurant_id = v_restaurant_id
    and is_active;

  select array_agg(id order by name)
  into v_business_category_ids
  from public.expense_categories
  where business_id = v_business_id
    and is_active;

  for v_day in
    select generate_series(v_start_date, v_end_date, interval '1 day')::date
  loop
    v_weekday := extract(isodow from v_day);
    v_turnover_bgn :=
      case v_weekday
        when 5 then 5100
        when 6 then 5900
        when 7 then 5450
        else 3600
      end
      + ((extract(day from v_day)::integer % 7) * 95)
      + ((extract(month from v_day)::integer % 4) * 130);

    v_turnover_eur := round(v_turnover_bgn / v_eur_bgn_rate, 4);
    v_card_ratio := 0.54 + ((extract(day from v_day)::integer % 4) * 0.05);
    v_card_amount_eur := round(v_turnover_eur * least(v_card_ratio, 0.78), 4);
    v_profit_ratio := 0.24 + ((extract(day from v_day)::integer % 5) * 0.015);
    v_profit_eur := round(v_turnover_eur * v_profit_ratio, 4);

    v_note :=
      case
        when v_weekday in (5, 6) then 'Strong evening service and delivery traffic.'
        when extract(day from v_day)::integer % 11 = 0 then 'Supplier delay caused a slower prep block.'
        when extract(day from v_day)::integer % 9 = 0 then 'Promotional lunch menu lifted turnover above plan.'
        else null
      end;

    insert into public.daily_reports (
      restaurant_id,
      work_date,
      turnover,
      profit,
      card_amount,
      manual_expense,
      notes
    )
    values (
      v_restaurant_id,
      v_day,
      v_turnover_eur,
      v_profit_eur,
      v_card_amount_eur,
      0,
      v_note
    )
    returning id into v_report_id;

    for v_employee in
      select
        e.id,
        e.daily_rate,
        e.is_active,
        row_number() over (order by e.created_at, e.id) as employee_rank
      from public.employees e
      where e.restaurant_id = v_restaurant_id
        and e.is_active
      order by e.created_at, e.id
    loop
      v_employee_is_present :=
        (
          (
            extract(day from v_day)::integer
            + v_employee.employee_rank
            + case when v_weekday in (5, 6, 7) then 1 else 0 end
          ) % 5
        ) <> 0;

      if not v_employee_is_present then
        continue;
      end if;

      v_pay_units :=
        case
          when (
            extract(day from v_day)::integer + v_employee.employee_rank + extract(month from v_day)::integer
          ) % 9 = 0 then 2
          when (
            extract(day from v_day)::integer + v_employee.employee_rank
          ) % 4 = 0 then 1.5
          else 1
        end;

      v_pay_override :=
        case
          when (
            extract(day from v_day)::integer + v_employee.employee_rank
          ) % 23 = 0
          then round((v_employee.daily_rate * v_pay_units) * 1.12, 4)
          else null
        end;

      v_attendance_note :=
        case
          when v_pay_units = 2 then 'Covered an extended split shift.'
          when v_pay_override is not null then 'Manual payout override for a special task.'
          when (
            extract(day from v_day)::integer + v_employee.employee_rank
          ) % 13 = 0 then 'Stayed late for stock count.'
          else null
        end;

      insert into public.attendance_entries (
        daily_report_id,
        employee_id,
        daily_rate,
        pay_units,
        pay_override,
        notes
      )
      values (
        v_report_id,
        v_employee.id,
        v_employee.daily_rate,
        v_pay_units,
        v_pay_override,
        v_attendance_note
      );
    end loop;

    v_expense_count :=
      case
        when v_weekday in (5, 6, 7) then 4
        else 3
      end;

    for v_expense_index in 1..v_expense_count loop
      v_category_slot :=
        ((extract(day from v_day)::integer + (v_expense_index * 2)) % cardinality(v_restaurant_category_ids)) + 1;
      v_business_category_slot :=
        ((extract(day from v_day)::integer + (v_expense_index * 2)) % cardinality(v_business_category_ids)) + 1;
      v_is_telegram_expense :=
        v_expense_index = v_expense_count
        and extract(day from v_day)::integer % 2 = 0;

      v_amount_original_bgn :=
        case v_expense_index
          when 1 then 290 + (v_weekday * 18) + ((extract(day from v_day)::integer % 6) * 14)
          when 2 then 130 + ((extract(day from v_day)::integer % 5) * 12)
          when 3 then 72 + ((extract(day from v_day)::integer % 7) * 8)
          else 165 + ((extract(day from v_day)::integer % 4) * 20)
        end;

      v_amount_eur := round(v_amount_original_bgn / v_eur_bgn_rate, 4);
      v_description := v_item_descriptions[v_category_slot];
      v_receipt_path :=
        case
          when v_expense_index = 1 or v_is_telegram_expense then
            format(
              'receipts/%s/%s-item-%s.jpg',
              v_restaurant_id,
              to_char(v_day, 'YYYY-MM-DD'),
              v_expense_index
            )
          else null
        end;
      v_receipt_ocr :=
        case
          when v_receipt_path is not null then
            format('Receipt OCR for %s on %s', lower(v_description), to_char(v_day, 'YYYY-MM-DD'))
          else null
        end;
      v_created_at :=
        timezone('utc', v_day::timestamp)
        + make_interval(hours => 8 + (v_expense_index * 2), mins => (v_expense_index * 11));

      if v_is_telegram_expense then
        select id
        into v_selected_telegram_user_id
        from public.telegram_users
        where restaurant_id = v_restaurant_id
        order by created_at
        offset ((extract(day from v_day)::integer + v_expense_index) % 3)
        limit 1;

        insert into public.operational_expenses (
          business_id,
          category_id,
          telegram_user_id,
          amount,
          currency,
          amount_original,
          currency_original,
          description,
          receipt_image_path,
          expense_date,
          source_type,
          created_at,
          updated_at
        )
        values (
          v_business_id,
          v_business_category_ids[v_business_category_slot],
          v_selected_telegram_user_id,
          v_amount_eur,
          'EUR',
          v_amount_original_bgn,
          'BGN',
          v_description,
          v_receipt_path,
          v_day,
          'telegram',
          v_created_at,
          v_created_at
        )
        returning id into v_operational_expense_id;
      else
        v_selected_telegram_user_id := null;
        v_operational_expense_id := null;
      end if;

      insert into public.daily_expense_items (
        legacy_operational_expense_id,
        daily_report_id,
        category_id,
        amount,
        amount_original,
        currency_original,
        description,
        receipt_image_path,
        receipt_ocr_text,
        source_type,
        telegram_user_id,
        created_at,
        updated_at
      )
      values (
        v_operational_expense_id,
        v_report_id,
        v_restaurant_category_ids[v_category_slot],
        v_amount_eur,
        v_amount_original_bgn,
        'BGN',
        v_description,
        v_receipt_path,
        v_receipt_ocr,
        case when v_is_telegram_expense then 'telegram' else 'web' end,
        v_selected_telegram_user_id,
        v_created_at,
        v_created_at
      );
    end loop;
  end loop;

  insert into public.telegram_ai_context_chunks (
    restaurant_id,
    source_type,
    source_id,
    chunk_text,
    freshness_at
  )
  select
    dr.restaurant_id,
    'daily_report',
    dr.id::text,
    dr.notes,
    coalesce(dr.updated_at, dr.created_at)
  from public.daily_reports dr
  where dr.restaurant_id = v_restaurant_id
    and dr.notes is not null
    and btrim(dr.notes) <> ''
  on conflict (source_type, source_id) do update
  set
    chunk_text = excluded.chunk_text,
    freshness_at = excluded.freshness_at;

  insert into public.telegram_ai_context_chunks (
    restaurant_id,
    source_type,
    source_id,
    chunk_text,
    freshness_at
  )
  select
    v_restaurant_id,
    'expense_item',
    dei.id::text,
    concat_ws(E'\n', dei.description, nullif(dei.receipt_ocr_text, '')),
    coalesce(dei.updated_at, dei.created_at, timezone('utc', now()))
  from public.daily_expense_items dei
  join public.daily_reports dr on dr.id = dei.daily_report_id
  where dr.restaurant_id = v_restaurant_id
    and coalesce(
      nullif(btrim(coalesce(dei.description, '')), ''),
      nullif(btrim(coalesce(dei.receipt_ocr_text, '')), '')
    ) is not null
  on conflict (source_type, source_id) do update
  set
    chunk_text = excluded.chunk_text,
    freshness_at = excluded.freshness_at;

  for v_period in
    with period_totals as (
      select
        ae.employee_id,
        case
          when extract(day from dr.work_date) <= 15
            then date_trunc('month', dr.work_date)::date
          else date_trunc('month', dr.work_date)::date + 15
        end as period_start,
        case
          when extract(day from dr.work_date) <= 15
            then date_trunc('month', dr.work_date)::date + 14
          else (date_trunc('month', dr.work_date)::date + interval '1 month - 1 day')::date
        end as period_end,
        round(sum(coalesce(ae.pay_override, ae.daily_rate * ae.pay_units)), 4) as total_amount
      from public.attendance_entries ae
      join public.daily_reports dr on dr.id = ae.daily_report_id
      join public.employees e on e.id = ae.employee_id
      where e.restaurant_id = v_restaurant_id
      group by 1, 2, 3
    )
    select *
    from period_totals
    where total_amount > 0
    order by period_start, period_end, employee_id
  loop
    v_advance_total := 0;

    if ((extract(day from v_period.period_start)::integer + length(v_period.employee_id::text)) % 5) <> 0 then
      v_advance_amount := round(
        v_period.total_amount
        * (
          case
            when v_period.total_amount >= 850 then 0.24
            when v_period.total_amount >= 650 then 0.20
            else 0.16
          end
        ),
        4
      );

      insert into public.payroll_payments (
        employee_id,
        amount,
        payment_type,
        paid_on,
        created_at
      )
      values (
        v_period.employee_id,
        v_advance_amount,
        'advance',
        v_period.period_start + 5,
        timezone('utc', v_period.period_start::timestamp) + interval '5 days 15 hours'
      );

      v_advance_total := v_advance_total + v_advance_amount;

      if v_period.total_amount >= 900 then
        v_advance_amount := round(v_period.total_amount * 0.08, 4);

        insert into public.payroll_payments (
          employee_id,
          amount,
          payment_type,
          paid_on,
          created_at
        )
        values (
          v_period.employee_id,
          v_advance_amount,
          'advance',
          v_period.period_start + 10,
          timezone('utc', v_period.period_start::timestamp) + interval '10 days 11 hours'
        );

        v_advance_total := v_advance_total + v_advance_amount;
      end if;
    end if;

    if v_period.period_end < current_date then
      v_net_amount := greatest(round(v_period.total_amount - v_advance_total, 4), 0);

      insert into public.payroll_payments (
        employee_id,
        amount,
        payment_type,
        period_start,
        period_end,
        paid_on,
        created_at
      )
      values (
        v_period.employee_id,
        v_net_amount,
        'payroll',
        v_period.period_start,
        v_period.period_end,
        v_period.period_end,
        timezone('utc', v_period.period_end::timestamp) + interval '19 hours'
      )
      on conflict do nothing;
    end if;
  end loop;

  update public.employees e
  set
    daily_rate = round(
      e.daily_rate
      * (
        case ranked.employee_rank
          when 1 then 1.05
          when 2 then 1.04
          when 3 then 1.06
          when 4 then 1.03
          else 1
        end
      ),
      4
    ),
    updated_at = timezone('utc', now())
  from (
    select
      id,
      row_number() over (order by created_at, id) as employee_rank
    from public.employees
    where restaurant_id = v_restaurant_id
      and is_active
  ) ranked
  where e.id = ranked.id
    and ranked.employee_rank <= least(4, v_employee_count);

  return jsonb_build_object(
    'restaurant_id', v_restaurant_id,
    'business_id', v_business_id,
    'employees', (
      select count(*)
      from public.employees
      where restaurant_id = v_restaurant_id
    ),
    'active_employees', (
      select count(*)
      from public.employees
      where restaurant_id = v_restaurant_id
        and is_active
    ),
    'reports', (
      select count(*)
      from public.daily_reports
      where restaurant_id = v_restaurant_id
    ),
    'attendance_entries', (
      select count(*)
      from public.attendance_entries ae
      join public.daily_reports dr on dr.id = ae.daily_report_id
      where dr.restaurant_id = v_restaurant_id
    ),
    'expense_items', (
      select count(*)
      from public.daily_expense_items dei
      join public.daily_reports dr on dr.id = dei.daily_report_id
      where dr.restaurant_id = v_restaurant_id
    ),
    'telegram_users', (
      select count(*)
      from public.telegram_users
      where restaurant_id = v_restaurant_id
    ),
    'payroll_payments', (
      select count(*)
      from public.payroll_payments pp
      join public.employees e on e.id = pp.employee_id
      where e.restaurant_id = v_restaurant_id
    ),
    'date_range', jsonb_build_object(
      'from', v_start_date,
      'to', v_end_date
    )
  );
end;
$$;

comment on function public.seed_koi_raboti_sandbox(uuid, text, text, text, integer, integer, boolean)
  is 'Seeds one restaurant with realistic employees, reports, expenses, payroll, and Telegram-linked sandbox data.';

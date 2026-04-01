alter table public.restaurants
  add column if not exists default_payroll_cadence text,
  add column if not exists default_weekly_payday integer,
  add column if not exists default_monthly_pay_day integer,
  add column if not exists default_twice_monthly_day_1 integer,
  add column if not exists default_twice_monthly_day_2 integer;

update public.restaurants
set
  default_payroll_cadence = coalesce(default_payroll_cadence, 'twice_monthly'),
  default_weekly_payday = coalesce(default_weekly_payday, 5),
  default_monthly_pay_day = coalesce(default_monthly_pay_day, 1),
  default_twice_monthly_day_1 = coalesce(default_twice_monthly_day_1, 15),
  default_twice_monthly_day_2 = coalesce(default_twice_monthly_day_2, 31);

alter table public.restaurants
  alter column default_weekly_payday set default 5,
  alter column default_monthly_pay_day set default 1,
  alter column default_twice_monthly_day_1 set default 15,
  alter column default_twice_monthly_day_2 set default 30,
  alter column default_payroll_cadence set default 'monthly',
  alter column default_payroll_cadence set not null;

alter table public.restaurants
  drop constraint if exists restaurants_default_payroll_cadence_check,
  drop constraint if exists restaurants_default_weekly_payday_check,
  drop constraint if exists restaurants_default_monthly_pay_day_check,
  drop constraint if exists restaurants_default_twice_monthly_day_1_check,
  drop constraint if exists restaurants_default_twice_monthly_day_2_check,
  drop constraint if exists restaurants_default_payroll_schedule_check;

alter table public.restaurants
  add constraint restaurants_default_payroll_cadence_check
    check (default_payroll_cadence in ('daily', 'weekly', 'twice_monthly', 'monthly')),
  add constraint restaurants_default_weekly_payday_check
    check (default_weekly_payday is null or default_weekly_payday between 1 and 7),
  add constraint restaurants_default_monthly_pay_day_check
    check (default_monthly_pay_day is null or default_monthly_pay_day between 1 and 31),
  add constraint restaurants_default_twice_monthly_day_1_check
    check (
      default_twice_monthly_day_1 is null
      or default_twice_monthly_day_1 between 1 and 31
    ),
  add constraint restaurants_default_twice_monthly_day_2_check
    check (
      default_twice_monthly_day_2 is null
      or default_twice_monthly_day_2 between 1 and 31
    ),
  add constraint restaurants_default_payroll_schedule_check
    check (
      (default_payroll_cadence <> 'weekly' or default_weekly_payday is not null)
      and (default_payroll_cadence <> 'monthly' or default_monthly_pay_day is not null)
      and (
        default_payroll_cadence <> 'twice_monthly'
        or (
          default_twice_monthly_day_1 is not null
          and default_twice_monthly_day_2 is not null
          and default_twice_monthly_day_1 <> default_twice_monthly_day_2
        )
      )
    );

comment on column public.restaurants.default_payroll_cadence is 'Default cadence for payroll due-highlighting and new employees.';

alter table public.employees
  add column if not exists use_restaurant_payroll_defaults boolean,
  add column if not exists payroll_cadence text,
  add column if not exists weekly_payday integer,
  add column if not exists monthly_pay_day integer,
  add column if not exists twice_monthly_day_1 integer,
  add column if not exists twice_monthly_day_2 integer;

update public.employees
set
  use_restaurant_payroll_defaults = coalesce(use_restaurant_payroll_defaults, true),
  payroll_cadence = case
    when coalesce(use_restaurant_payroll_defaults, true) then null
    else payroll_cadence
  end;

alter table public.employees
  alter column use_restaurant_payroll_defaults set default true,
  alter column use_restaurant_payroll_defaults set not null;

alter table public.employees
  drop constraint if exists employees_payroll_cadence_check,
  drop constraint if exists employees_weekly_payday_check,
  drop constraint if exists employees_monthly_pay_day_check,
  drop constraint if exists employees_twice_monthly_day_1_check,
  drop constraint if exists employees_twice_monthly_day_2_check,
  drop constraint if exists employees_payroll_override_required_check,
  drop constraint if exists employees_payroll_schedule_check;

alter table public.employees
  add constraint employees_payroll_cadence_check
    check (payroll_cadence is null or payroll_cadence in ('daily', 'weekly', 'twice_monthly', 'monthly')),
  add constraint employees_weekly_payday_check
    check (weekly_payday is null or weekly_payday between 1 and 7),
  add constraint employees_monthly_pay_day_check
    check (monthly_pay_day is null or monthly_pay_day between 1 and 31),
  add constraint employees_twice_monthly_day_1_check
    check (twice_monthly_day_1 is null or twice_monthly_day_1 between 1 and 31),
  add constraint employees_twice_monthly_day_2_check
    check (twice_monthly_day_2 is null or twice_monthly_day_2 between 1 and 31),
  add constraint employees_payroll_override_required_check
    check (use_restaurant_payroll_defaults or payroll_cadence is not null),
  add constraint employees_payroll_schedule_check
    check (
      use_restaurant_payroll_defaults
      or (
        (payroll_cadence <> 'weekly' or weekly_payday is not null)
        and (payroll_cadence <> 'monthly' or monthly_pay_day is not null)
        and (
          payroll_cadence <> 'twice_monthly'
          or (
            twice_monthly_day_1 is not null
            and twice_monthly_day_2 is not null
            and twice_monthly_day_1 <> twice_monthly_day_2
          )
        )
      )
    );

comment on column public.employees.use_restaurant_payroll_defaults is 'When true, the employee inherits the restaurant payroll cadence and schedule.';

alter table public.payroll_payments
  add column if not exists paid_on date;

update public.payroll_payments
set paid_on = coalesce(paid_on, created_at::date, period_end, period_start, current_date)
where paid_on is null;

alter table public.payroll_payments
  alter column paid_on set default current_date,
  alter column paid_on set not null,
  alter column period_start drop not null,
  alter column period_end drop not null;

update public.payroll_payments
set
  period_start = null,
  period_end = null
where payment_type = 'advance';

alter table public.payroll_payments
  drop constraint if exists payroll_payments_period_bounds_check,
  drop constraint if exists payroll_payments_period_shape_check;

alter table public.payroll_payments
  add constraint payroll_payments_period_shape_check
    check (
      (
        payment_type = 'advance'
        and period_start is null
        and period_end is null
      )
      or (
        payment_type = 'payroll'
        and period_start is not null
        and period_end is not null
        and period_start <= period_end
      )
    );

comment on column public.payroll_payments.period_start is 'Settlement coverage start date. Null for advances.';
comment on column public.payroll_payments.period_end is 'Settlement coverage end date. Null for advances.';
comment on column public.payroll_payments.paid_on is 'Effective payment date for advances and payroll settlements.';

drop function if exists public.register_restaurant(uuid, text, text, text, numeric);

create or replace function public.register_restaurant(
  p_user_id uuid,
  p_user_email text,
  p_restaurant_name text,
  p_admin_full_name text,
  p_default_daily_expense numeric,
  p_default_payroll_cadence text,
  p_default_weekly_payday integer,
  p_default_monthly_pay_day integer,
  p_default_twice_monthly_day_1 integer,
  p_default_twice_monthly_day_2 integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  insert into public.restaurants (
    name,
    default_daily_expense,
    default_payroll_cadence,
    default_weekly_payday,
    default_monthly_pay_day,
    default_twice_monthly_day_1,
    default_twice_monthly_day_2
  )
  values (
    p_restaurant_name,
    p_default_daily_expense,
    p_default_payroll_cadence,
    p_default_weekly_payday,
    p_default_monthly_pay_day,
    p_default_twice_monthly_day_1,
    p_default_twice_monthly_day_2
  )
  returning id into v_restaurant_id;

  insert into public.profiles (id, restaurant_id, full_name, email)
  values (p_user_id, v_restaurant_id, p_admin_full_name, p_user_email);

  perform public.seed_restaurant_expense_categories(v_restaurant_id);

  return v_restaurant_id;
end;
$$;

grant execute on function public.register_restaurant(uuid, text, text, text, numeric, text, integer, integer, integer, integer)
  to anon, authenticated;

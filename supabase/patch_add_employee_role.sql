-- Patch: add employee role for kitchen/service grouping
-- Safe to run on an existing database before applying the updated UI logic.

alter table public.employees
  add column if not exists role text;

update public.employees
set role = coalesce(role, 'service');

alter table public.employees
  alter column role set default 'service',
  alter column role set not null;

alter table public.employees
  drop constraint if exists employees_role_check;

alter table public.employees
  add constraint employees_role_check
  check (role in ('kitchen', 'service'));

comment on column public.employees.role is 'Employee role used for grouping and color-coding in the UI. Allowed values: kitchen or service.';

-- Radar AI — Mercado Pago, Start/Pro e faturas Pix
alter table public.companies add column if not exists plan_tier text;
alter table public.companies add column if not exists billing_cycle text;
alter table public.companies add column if not exists current_period_end timestamptz;

update public.companies
set plan = case
  when plan in ('ouro', 'prata') then 'pro'
  when plan = 'bronze' then 'start'
  else plan
end
where plan in ('bronze', 'prata', 'ouro');

update public.companies
set plan_tier = plan
where plan_tier is null and plan in ('start', 'pro');

alter table public.companies drop constraint if exists companies_plan_check;
alter table public.companies add constraint companies_plan_check
  check (plan is null or plan in ('start', 'pro'));

alter table public.companies drop constraint if exists companies_plan_tier_check;
alter table public.companies add constraint companies_plan_tier_check
  check (plan_tier is null or plan_tier in ('start', 'pro'));

alter table public.companies drop constraint if exists companies_billing_cycle_check;
alter table public.companies add constraint companies_billing_cycle_check
  check (billing_cycle is null or billing_cycle in ('monthly', 'quarterly'));

alter table public.companies drop constraint if exists companies_subscription_status_check;
alter table public.companies add constraint companies_subscription_status_check
  check (subscription_status in ('pending', 'active', 'past_due', 'suspended', 'cancelled'));

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  mp_payment_id text unique,
  amount numeric(10, 2) not null,
  currency text not null default 'BRL',
  status text not null default 'pending',
  plan_tier text,
  billing_cycle text,
  kind text not null default 'new',
  pix_qr_code text,
  pix_qr_base64 text,
  description text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payments_status_check check (
    status in ('pending', 'approved', 'rejected', 'cancelled', 'in_process')
  ),
  constraint payments_plan_tier_check check (plan_tier is null or plan_tier in ('start', 'pro')),
  constraint payments_billing_cycle_check check (
    billing_cycle is null or billing_cycle in ('monthly', 'quarterly')
  ),
  constraint payments_kind_check check (kind in ('new', 'renew', 'upgrade'))
);

create index if not exists payments_company_id_idx on public.payments (company_id, created_at desc);

alter table public.payments enable row level security;

drop policy if exists "payments_select_company" on public.payments;
create policy "payments_select_company"
  on public.payments for select
  to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "payments_insert_admin" on public.payments;
create policy "payments_insert_admin"
  on public.payments for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.is_company_admin());

grant select, insert on public.payments to authenticated;
grant all on public.payments to service_role;

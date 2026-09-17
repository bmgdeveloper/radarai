-- Radar AI — assinaturas cartão Mercado Pago + trial 7 dias
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  plan_tier text not null,
  billing_cycle text not null,
  status text not null default 'TRIAL',
  trial_ends_at timestamptz,
  mp_preapproval_id text unique,
  amount numeric(10, 2) not null default 0,
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_plan_tier_check check (plan_tier in ('start', 'pro')),
  constraint subscriptions_billing_cycle_check check (
    billing_cycle in ('monthly', 'quarterly')
  ),
  constraint subscriptions_status_check check (
    status in ('TRIAL', 'ACTIVE', 'CANCELLED', 'PAST_DUE', 'PAUSED')
  )
);

create index if not exists subscriptions_company_id_idx
  on public.subscriptions (company_id, created_at desc);

create unique index if not exists subscriptions_company_active_idx
  on public.subscriptions (company_id)
  where status in ('TRIAL', 'ACTIVE');

alter table public.companies drop constraint if exists companies_subscription_status_check;
alter table public.companies add constraint companies_subscription_status_check
  check (
    subscription_status in (
      'pending', 'trial', 'active', 'past_due', 'suspended', 'cancelled'
    )
  );

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_company" on public.subscriptions;
create policy "subscriptions_select_company"
  on public.subscriptions for select
  to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "subscriptions_insert_admin" on public.subscriptions;
create policy "subscriptions_insert_admin"
  on public.subscriptions for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.is_company_admin());

drop policy if exists "subscriptions_update_admin" on public.subscriptions;
create policy "subscriptions_update_admin"
  on public.subscriptions for update
  to authenticated
  using (company_id = public.current_company_id() and public.is_company_admin())
  with check (company_id = public.current_company_id() and public.is_company_admin());

grant select, insert, update on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

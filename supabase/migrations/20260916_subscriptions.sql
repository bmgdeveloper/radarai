-- Radar AI — Fase 4: assinatura e adimplência
alter table public.companies add column if not exists is_active boolean not null default false;
alter table public.companies add column if not exists plan text;
alter table public.companies add column if not exists subscription_status text not null default 'pending';
alter table public.companies add column if not exists asaas_customer_id text;
alter table public.companies add column if not exists asaas_subscription_id text;

alter table public.companies drop constraint if exists companies_plan_check;
alter table public.companies add constraint companies_plan_check
  check (plan is null or plan in ('bronze', 'prata', 'ouro'));

alter table public.companies drop constraint if exists companies_subscription_status_check;
alter table public.companies add constraint companies_subscription_status_check
  check (subscription_status in ('pending', 'active', 'past_due', 'cancelled'));

create unique index if not exists companies_asaas_subscription_id_idx
  on public.companies (asaas_subscription_id)
  where asaas_subscription_id is not null;

drop policy if exists "alert_settings_insert_admin" on public.alert_settings;
create policy "alert_settings_insert_admin"
  on public.alert_settings for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.is_company_admin());

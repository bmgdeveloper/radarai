-- Radar AI — schema inicial (multitenancy + RLS)
-- Execute no SQL Editor do Supabase (ou via CLI: supabase db push).

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'channel_platform') then
    create type public.channel_platform as enum (
      'playstore',
      'appstore',
      'reclameaqui',
      'consumidorgov',
      'google',
      'ifood',
      'mercadolivre',
      'amazon',
      'app99'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'feedback_sentiment') then
    create type public.feedback_sentiment as enum (
      'POSITIVO',
      'NEUTRO',
      'NEGATIVO'
    );
  end if;
end
$$;

alter type public.channel_platform add value if not exists 'consumidorgov';
alter type public.channel_platform add value if not exists 'mercadolivre';
alter type public.channel_platform add value if not exists 'amazon';
alter type public.channel_platform add value if not exists 'app99';

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  is_active boolean not null default false,
  plan text,
  plan_tier text,
  billing_cycle text,
  current_period_end timestamptz,
  subscription_status text not null default 'pending',
  asaas_customer_id text,
  asaas_subscription_id text,
  created_at timestamptz not null default now(),
  constraint companies_plan_check check (plan is null or plan in ('start', 'pro')),
  constraint companies_plan_tier_check check (plan_tier is null or plan_tier in ('start', 'pro')),
  constraint companies_billing_cycle_check check (
    billing_cycle is null or billing_cycle in ('monthly', 'quarterly')
  ),
  constraint companies_subscription_status_check check (
    subscription_status in ('pending', 'trial', 'active', 'past_due', 'suspended', 'cancelled')
  )
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  name text,
  role text not null default 'member',
  constraint users_role_check check (role in ('owner', 'admin', 'member'))
);

create table if not exists public.monitored_channels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  platform text not null,
  url_or_app_id text not null,
  is_active boolean not null default true
);

alter table public.monitored_channels
  alter column platform type text using platform::text;

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  channel_id uuid not null references public.monitored_channels (id) on delete cascade,
  external_id text not null unique,
  author text,
  rating integer,
  text text,
  sentiment public.feedback_sentiment,
  category text,
  summary text,
  needs_alert boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint feedbacks_rating_check check (rating is null or rating between 1 and 5)
);

create table if not exists public.alert_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies (id) on delete cascade,
  whatsapp_number text,
  min_rating_trigger integer not null default 3,
  constraint alert_settings_min_rating_check check (min_rating_trigger between 1 and 5)
);

create index if not exists users_company_id_idx on public.users (company_id);
create index if not exists monitored_channels_company_id_idx
  on public.monitored_channels (company_id);
create unique index if not exists monitored_channels_company_platform_idx
  on public.monitored_channels (company_id, platform);
create index if not exists feedbacks_company_id_idx on public.feedbacks (company_id);
create index if not exists feedbacks_channel_id_idx on public.feedbacks (channel_id);
create index if not exists feedbacks_published_at_idx
  on public.feedbacks (published_at desc);
create index if not exists feedbacks_needs_alert_idx
  on public.feedbacks (company_id)
  where needs_alert = true;
create index if not exists feedbacks_sentiment_idx
  on public.feedbacks (company_id, sentiment);

alter table public.feedbacks add column if not exists summary text;

alter table public.companies add column if not exists is_active boolean not null default false;
alter table public.companies add column if not exists plan text;
alter table public.companies add column if not exists plan_tier text;
alter table public.companies add column if not exists billing_cycle text;
alter table public.companies add column if not exists current_period_end timestamptz;
alter table public.companies add column if not exists subscription_status text not null default 'pending';
alter table public.companies add column if not exists asaas_customer_id text;
alter table public.companies add column if not exists asaas_subscription_id text;

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

create unique index if not exists companies_asaas_subscription_id_idx
  on public.companies (asaas_subscription_id)
  where asaas_subscription_id is not null;

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

-- Isola o tenant do usuário autenticado sem recursão de RLS em public.users.
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.company_id
  from public.users as u
  where u.id = auth.uid()
  limit 1
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users as u
  where u.id = auth.uid()
  limit 1
$$;

create or replace function public.is_company_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('owner', 'admin')
$$;

-- Onboarding: cria a empresa e vincula o usuário autenticado como owner.
create or replace function public.create_company(p_name text, p_cnpj text default null)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company public.companies;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.current_company_id() is not null then
    raise exception 'User already belongs to a company';
  end if;

  insert into public.companies (name, cnpj)
  values (p_name, p_cnpj)
  returning * into new_company;

  insert into public.users (id, company_id, name, role)
  values (
    auth.uid(),
    new_company.id,
    coalesce(auth.jwt() ->> 'email', ''),
    'owner'
  )
  on conflict (id) do update
    set company_id = excluded.company_id,
        role = 'owner';

  insert into public.alert_settings (company_id)
  values (new_company.id)
  on conflict (company_id) do nothing;

  return new_company;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.email),
    'member'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.monitored_channels enable row level security;
alter table public.feedbacks enable row level security;
alter table public.alert_settings enable row level security;

drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own"
  on public.companies for select
  to authenticated
  using (id = public.current_company_id());

drop policy if exists "companies_update_admin" on public.companies;
create policy "companies_update_admin"
  on public.companies for update
  to authenticated
  using (id = public.current_company_id() and public.is_company_admin())
  with check (id = public.current_company_id() and public.is_company_admin());

drop policy if exists "users_select_company" on public.users;
create policy "users_select_company"
  on public.users for select
  to authenticated
  using (id = auth.uid() or company_id = public.current_company_id());

drop policy if exists "users_update_self_or_admin" on public.users;
create policy "users_update_self_or_admin"
  on public.users for update
  to authenticated
  using (id = auth.uid() or (company_id = public.current_company_id() and public.is_company_admin()))
  with check (id = auth.uid() or (company_id = public.current_company_id() and public.is_company_admin()));

drop policy if exists "channels_select_company" on public.monitored_channels;
create policy "channels_select_company"
  on public.monitored_channels for select
  to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "channels_insert_admin" on public.monitored_channels;
create policy "channels_insert_admin"
  on public.monitored_channels for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.is_company_admin());

drop policy if exists "channels_update_admin" on public.monitored_channels;
create policy "channels_update_admin"
  on public.monitored_channels for update
  to authenticated
  using (company_id = public.current_company_id() and public.is_company_admin())
  with check (company_id = public.current_company_id() and public.is_company_admin());

drop policy if exists "channels_delete_admin" on public.monitored_channels;
create policy "channels_delete_admin"
  on public.monitored_channels for delete
  to authenticated
  using (company_id = public.current_company_id() and public.is_company_admin());

drop policy if exists "feedbacks_select_company" on public.feedbacks;
create policy "feedbacks_select_company"
  on public.feedbacks for select
  to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "feedbacks_insert_company" on public.feedbacks;
create policy "feedbacks_insert_company"
  on public.feedbacks for insert
  to authenticated
  with check (company_id = public.current_company_id());

drop policy if exists "feedbacks_update_company" on public.feedbacks;
create policy "feedbacks_update_company"
  on public.feedbacks for update
  to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "alert_settings_select_company" on public.alert_settings;
create policy "alert_settings_select_company"
  on public.alert_settings for select
  to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "alert_settings_update_admin" on public.alert_settings;
create policy "alert_settings_update_admin"
  on public.alert_settings for update
  to authenticated
  using (company_id = public.current_company_id() and public.is_company_admin())
  with check (company_id = public.current_company_id() and public.is_company_admin());

drop policy if exists "alert_settings_insert_admin" on public.alert_settings;
create policy "alert_settings_insert_admin"
  on public.alert_settings for insert
  to authenticated
  with check (company_id = public.current_company_id() and public.is_company_admin());

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

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.monitored_channels to authenticated;
grant select, insert, update, delete on public.feedbacks to authenticated;
grant select, insert, update, delete on public.alert_settings to authenticated;
grant select, insert on public.payments to authenticated;
grant select, insert, update on public.subscriptions to authenticated;

grant all on public.companies to service_role;
grant all on public.users to service_role;
grant all on public.monitored_channels to service_role;
grant all on public.feedbacks to service_role;
grant all on public.alert_settings to service_role;
grant all on public.payments to service_role;
grant all on public.subscriptions to service_role;

grant execute on function public.current_company_id() to authenticated, service_role;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.is_company_admin() to authenticated, service_role;
grant execute on function public.create_company(text, text) to authenticated, service_role;

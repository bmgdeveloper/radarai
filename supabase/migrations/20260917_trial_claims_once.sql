-- Claims de trial: impede 2º teste grátis para o mesmo e-mail + empresa
create table if not exists public.trial_claims (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null,
  company_name_normalized text not null,
  company_id uuid references public.companies (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  claimed_at timestamptz not null default now(),
  constraint trial_claims_email_company_unique unique (
    email_normalized,
    company_name_normalized
  )
);

create index if not exists trial_claims_email_idx
  on public.trial_claims (email_normalized);

create index if not exists trial_claims_company_id_idx
  on public.trial_claims (company_id);

alter table public.trial_claims enable row level security;

-- Leitura apenas da própria empresa (admin); writes via service_role no checkout
drop policy if exists "trial_claims_select_company" on public.trial_claims;
create policy "trial_claims_select_company"
  on public.trial_claims for select
  to authenticated
  using (
    company_id = public.current_company_id()
    or user_id = auth.uid()
  );

grant select on public.trial_claims to authenticated;
grant all on public.trial_claims to service_role;

-- Snapshot do e-mail/empresa na assinatura (auditoria)
alter table public.subscriptions
  add column if not exists payer_email text;

alter table public.subscriptions
  add column if not exists company_name_snapshot text;

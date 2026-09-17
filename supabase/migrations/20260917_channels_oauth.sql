-- OAuth credentials for private channel integrations (iFood, Mercado Livre).
do $$ begin
  create type public.channel_auth_type as enum ('link', 'oauth');
exception
  when duplicate_object then null;
end $$;

alter table public.monitored_channels
  add column if not exists access_token text,
  add column if not exists refresh_token text,
  add column if not exists merchant_id text,
  add column if not exists auth_type public.channel_auth_type not null default 'link';

comment on column public.monitored_channels.access_token is
  'OAuth access token for private platforms (iFood / Mercado Livre).';
comment on column public.monitored_channels.refresh_token is
  'OAuth refresh token for private platforms.';
comment on column public.monitored_channels.merchant_id is
  'Merchant / seller id returned by the private platform OAuth.';
comment on column public.monitored_channels.auth_type is
  'How the channel was connected: public link or OAuth account.';

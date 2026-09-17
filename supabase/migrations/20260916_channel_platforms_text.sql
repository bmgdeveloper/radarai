-- Radar AI — platform deixa de ser enum (novas fontes não exigem ALTER TYPE)
alter table public.monitored_channels
  alter column platform type text using platform::text;

create unique index if not exists monitored_channels_company_platform_idx
  on public.monitored_channels (company_id, platform);

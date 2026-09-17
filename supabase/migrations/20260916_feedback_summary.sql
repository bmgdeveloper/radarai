-- Radar AI — Fase 3: resumo gerado pela IA
alter table public.feedbacks add column if not exists summary text;

create index if not exists feedbacks_sentiment_idx
  on public.feedbacks (company_id, sentiment);

-- Radar AI — seed de testes (Fase 4/5)
-- Execute no SQL Editor do Supabase DEPOIS do schema/migrations.
-- Login: teste@bmgtechai.com.br / Teste123456!
-- Inclui um surto mockado de "Bug de Login" / "Erro ao entrar no app" para validar Insights de IA.

create extension if not exists pgcrypto;

do $$
declare
  v_user_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  v_company_id uuid := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  v_play_id uuid := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  v_ra_id uuid := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
begin
  insert into public.companies (
    id, name, cnpj, is_active, plan, plan_tier, billing_cycle,
    subscription_status, current_period_end
  )
  values (
    v_company_id,
    'Empresa Teste BMG',
    '12345678000199',
    true,
    'pro',
    'pro',
    'monthly',
    'active',
    now() + interval '30 days'
  )
  on conflict (id) do update
    set name = excluded.name,
        is_active = true,
        plan = 'pro',
        plan_tier = 'pro',
        billing_cycle = 'monthly',
        subscription_status = 'active',
        current_period_end = excluded.current_period_end;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'teste@bmgtechai.com.br',
    crypt('Teste123456!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin Teste BMG"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  on conflict (id) do update
    set email = excluded.email,
        encrypted_password = excluded.encrypted_password,
        email_confirmed_at = now();

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'teste@bmgtechai.com.br'),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  )
  on conflict (provider, provider_id) do nothing;

  insert into public.users (id, company_id, name, role)
  values (v_user_id, v_company_id, 'Admin Teste BMG', 'owner')
  on conflict (id) do update
    set company_id = excluded.company_id,
        name = excluded.name,
        role = 'owner';

  insert into public.alert_settings (company_id, whatsapp_number, min_rating_trigger)
  values (v_company_id, '5571991487176', 2)
  on conflict (company_id) do update
    set whatsapp_number = excluded.whatsapp_number;

  insert into public.monitored_channels (id, company_id, platform, url_or_app_id, is_active)
  values
    (v_play_id, v_company_id, 'playstore', 'com.whatsapp', true),
    (v_ra_id, v_company_id, 'reclameaqui', 'https://www.reclameaqui.com.br/empresa/whatsapp/', true)
  on conflict (id) do nothing;

  insert into public.feedbacks (
    company_id, channel_id, external_id, author, rating, text,
    sentiment, category, summary, needs_alert, published_at
  )
  values
    (
      v_company_id, v_play_id, 'seed-play-1', 'Carla M.', 1,
      'O app trava no checkout e ninguem responde no suporte.',
      'NEGATIVO', 'Atendimento', 'Cliente relata travamento no checkout e ausencia de suporte.', true,
      now() - interval '1 day'
    ),
    (
      v_company_id, v_play_id, 'seed-play-2', 'Rafael P.', 2,
      'Demora demais para carregar as avaliacoes do pedido.',
      'NEGATIVO', 'Performance', 'Lentidao ao carregar a tela de pedidos.', true,
      now() - interval '2 days'
    ),
    (
      v_company_id, v_ra_id, 'seed-ra-1', 'Juliana S.', 3,
      'Funciona, mas o status do pedido fica desatualizado.',
      'NEUTRO', 'Produto', 'Status do pedido inconsistente, sem tom agressivo.', false,
      now() - interval '3 days'
    ),
    (
      v_company_id, v_play_id, 'seed-play-3', 'Marcos A.', 4,
      'Melhorou depois da ultima atualizacao. Ainda falha de vez em quando.',
      'POSITIVO', 'Produto', 'Atualizacao recente melhorou a experiencia.', false,
      now() - interval '4 days'
    ),
    (
      v_company_id, v_ra_id, 'seed-ra-2', 'Ana Beatriz', 5,
      'Atendimento rapido no WhatsApp e problema resolvido no mesmo dia.',
      'POSITIVO', 'Atendimento', 'Elogio ao tempo de resposta e resolucao.', false,
      now() - interval '5 days'
    ),
    (
      v_company_id, v_play_id, 'seed-login-1', 'Bruno T.', 1,
      'Bug de Login. Coloco usuario e senha certos e nao entra no app.',
      'NEGATIVO', 'App / Inoperante', 'Falha recorrente de autenticacao no login.', true,
      now() - interval '6 hours'
    ),
    (
      v_company_id, v_play_id, 'seed-login-2', 'Fernanda L.', 1,
      'Erro ao entrar no app depois da atualizacao. Fica na tela de login.',
      'NEGATIVO', 'App / Inoperante', 'Erro ao entrar no aplicativo apos update.', true,
      now() - interval '8 hours'
    ),
    (
      v_company_id, v_ra_id, 'seed-login-3', 'Paulo Henrique', 2,
      'Nao consigo fazer login. Diz que a autenticacao falhou.',
      'NEGATIVO', 'App / Inoperante', 'Autenticacao recusada mesmo com senha valida.', true,
      now() - interval '12 hours'
    ),
    (
      v_company_id, v_play_id, 'seed-login-4', 'Camila R.', 1,
      'Bug de Login / autenticacao. Ja redefini a senha e continuo fora.',
      'NEGATIVO', 'App / Inoperante', 'Login quebrado mesmo apos reset de senha.', true,
      now() - interval '18 hours'
    ),
    (
      v_company_id, v_ra_id, 'seed-login-5', 'Diego Alves', 1,
      'Erro ao entrar no app: carrega, pede login e volta para a mesma tela.',
      'NEGATIVO', 'App / Inoperante', 'Loop na tela de login impede o acesso.', true,
      now() - interval '1 day'
    ),
    (
      v_company_id, v_play_id, 'seed-login-6', 'Sofia M.', 1,
      'Toda hora aparece Bug de Login. Nao consigo entrar no app de jeito nenhum.',
      'NEGATIVO', 'App / Inoperante', 'Relato de bug de login bloqueando o acesso.', true,
      now() - interval '30 hours'
    ),
    (
      v_company_id, v_ra_id, 'seed-pix-1', 'Igor N.', 1,
      'Tentei pagar no Pix e a transacao ficou pendente. Ninguem resolve.',
      'NEGATIVO', 'Cobrança / Financeiro', 'Falha no Pix com transacao pendente.', true,
      now() - interval '2 days'
    ),
    (
      v_company_id, v_play_id, 'seed-pix-2', 'Helena C.', 2,
      'Erro no Pix na hora de concluir o pagamento do pedido.',
      'NEGATIVO', 'Cobrança / Financeiro', 'Erro ao concluir pagamento via Pix.', true,
      now() - interval '3 days'
    )
  on conflict (external_id) do update
    set text = excluded.text,
        rating = excluded.rating,
        sentiment = excluded.sentiment,
        category = excluded.category,
        summary = excluded.summary,
        needs_alert = excluded.needs_alert,
        published_at = excluded.published_at;

  insert into public.payments (
    company_id, amount, status, plan_tier, billing_cycle, kind, description, paid_at
  )
  values (
    v_company_id, 70.00, 'approved', 'pro', 'monthly', 'new',
    'Radar AI Pro mensal — seed', now() - interval '1 day'
  );
end
$$;

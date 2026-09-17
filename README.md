# Radar AI

Monitoramento de reputação (`radar.bmgtechai.com.br`) com Next.js, Supabase e Meta WhatsApp Cloud API. Hospedagem no Netlify.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Preencha as variáveis no `.env.local` e execute `supabase/schema.sql` no SQL Editor do Supabase.

Webhook da Meta: `https://radar.bmgtechai.com.br/api/webhooks/whatsapp`

import type { Config } from "@netlify/functions";

/**
 * Agenda a coleta automática de feedbacks.
 * Chama a API Next com CRON_SECRET (mesmo endpoint usado manualmente).
 * Horário: a cada hora (UTC) — cobre Start (1x/dia) e Pro (a cada ~2h) na prática
 * quando o job roda com frequência suficiente.
 */
export default async () => {
  const siteUrl = (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).replace(/\/$/, "");
  const secret = process.env.CRON_SECRET?.trim() ?? "";

  if (!siteUrl) {
    return new Response("URL do site não configurada.", { status: 500 });
  }
  if (!secret) {
    return new Response("CRON_SECRET não configurado.", { status: 500 });
  }

  const response = await fetch(`${siteUrl}/api/cron/collect-feedbacks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "x-cron-secret": secret,
    },
  });

  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
};

export const config: Config = {
  schedule: "0 * * * *",
};

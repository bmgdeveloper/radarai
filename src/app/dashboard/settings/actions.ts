"use server";

import { revalidatePath } from "next/cache";
import { requireCompany } from "@/lib/auth/session";
import { areChannelsLocked } from "@/lib/billing/test-mode";
import { createClient } from "@/lib/supabase/server";
import {
  fetchReviewsForChannel,
  isSupportedScraperPlatform,
} from "@/services/scrapers";
import { sendWhatsAppTemplateNotification } from "@/services/meta/whatsappService";
import type { ChannelPlatform } from "@/services/scrapers/types";
import { addChannelAction, saveWhatsAppAction } from "@/app/onboarding/actions";
import { collectAndStoreFeedbacks } from "@/services/ingestion/collectFeedbacks";

export { addChannelAction, saveWhatsAppAction };

export async function toggleChannelAction(channelId: string, isActive: boolean) {
  const { company } = await requireCompany();
  const supabase = await createClient();
  const { error } = await supabase
    .from("monitored_channels")
    .update({ is_active: isActive })
    .eq("id", channelId)
    .eq("company_id", company.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return { ok: true as const };
}

export async function deleteChannelAction(channelId: string) {
  const { company } = await requireCompany();
  if (areChannelsLocked(company.is_active)) {
    return {
      error:
        "Para alterar ou incluir novos canais monitorados, entre em contato com o suporte BMG Tech AI.",
    };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("monitored_channels")
    .delete()
    .eq("id", channelId)
    .eq("company_id", company.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return { ok: true as const };
}

export async function testChannelAction(channelId: string) {
  const { company } = await requireCompany();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monitored_channels")
    .select("id, platform, url_or_app_id")
    .eq("id", channelId)
    .eq("company_id", company.id)
    .maybeSingle();

  if (error || !data) return { error: "Canal não encontrado." };

  const platform = data.platform as ChannelPlatform;
  if (!isSupportedScraperPlatform(platform)) {
    if (platform === "ifood") {
      const okUrl = data.url_or_app_id.includes("ifood");
      if (!okUrl) return { error: "Informe um link válido do iFood." };
      return {
        ok: true as const,
        message:
          "Link válido. A coleta do iFood ainda não está ligada — falta API de parceiro e autorização da loja.",
      };
    }
    if (platform === "amazon") {
      const okUrl = /amazon\./i.test(data.url_or_app_id);
      if (!okUrl) return { error: "Informe um link válido da Amazon." };
      return {
        ok: true as const,
        message:
          "Link válido. A Amazon não libera o texto das avaliações por API; a coleta automática dessa fonte ainda não entra.",
      };
    }
    if (platform === "app99") {
      return {
        ok: true as const,
        message:
          "Canal cadastrado. A 99/99Food não expõe avaliações públicas; a coleta automática ainda não entra.",
      };
    }
    return { error: "Plataforma sem coleta automática." };
  }

  try {
    const reviews = await fetchReviewsForChannel(platform, data.url_or_app_id, 3);
    return {
      ok: true as const,
      message: `Conexão ok. ${reviews.length} review(s) recentes encontradas.`,
    };
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : "Falha ao testar o canal.",
    };
  }
}

export async function sendWhatsAppTestAction() {
  const { company } = await requireCompany();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alert_settings")
    .select("whatsapp_number")
    .eq("company_id", company.id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data?.whatsapp_number) {
    return { error: "Cadastre um número de WhatsApp primeiro." };
  }

  const template =
    process.env.META_WA_ALERT_TEMPLATE?.trim() || "radar_alert";

  try {
    await sendWhatsAppTemplateNotification(data.whatsapp_number, template, [
      company.name,
      "teste",
      "Radar AI",
      "Mensagem de teste do Radar AI.",
    ]);
    return { ok: true as const, message: "Mensagem de teste enviada." };
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : "Falha ao enviar o WhatsApp.",
    };
  }
}

export async function collectNowAction() {
  const { company } = await requireCompany();
  if (!company.is_active) {
    return { error: "A coleta só roda com a conta ativa." };
  }

  try {
    const result = await collectAndStoreFeedbacks(company.id);
    const inserted = result.processed.reduce((sum, row) => sum + row.inserted, 0);
    const failed = result.processed.filter((row) => row.error);
    const skipped = result.processed.filter((row) => row.skipped).length;
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");

    if (result.channels === 0) {
      return { error: "Nenhum canal ativo para coletar." };
    }

    const parts = [`${inserted} feedback(s) novo(s)`];
    if (skipped) parts.push(`${skipped} fonte(s) ainda sem coleta automática`);
    if (failed.length) {
      parts.push(
        failed.map((row) => `${row.platform}: ${row.error}`).join(" · "),
      );
    }

    return { ok: true as const, message: parts.join(". ") };
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : "Falha na coleta.",
    };
  }
}

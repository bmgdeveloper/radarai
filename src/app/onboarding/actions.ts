"use server";

import { revalidatePath } from "next/cache";
import { requireCompany, requireUser } from "@/lib/auth/session";
import { areChannelsLocked } from "@/lib/billing/channel-locks";
import { isPlanTier, type PlanTier } from "@/lib/billing/plans";
import { channelLimitError } from "@/lib/channels/limits";
import { createClient } from "@/lib/supabase/server";
import { isChannelPlatform } from "@/services/scrapers/types";
import {
  collectOneChannel,
  summarizeChannelCollection,
} from "@/services/ingestion/collectFeedbacks";

export async function saveCompanyAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").replace(/\D/g, "");
  if (!name) return { error: "Informe o nome da empresa." };

  const context = await requireUser();
  const supabase = await createClient();

  if (!context.company) {
    const { error } = await supabase.rpc("create_company", {
      p_name: name,
      p_cnpj: cnpj || null,
    });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("companies")
      .update({ name, cnpj: cnpj || null })
      .eq("id", context.company.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function addChannelAction(formData: FormData) {
  const platform = String(formData.get("platform") ?? "");
  const urlOrAppId = String(formData.get("urlOrAppId") ?? "").trim();
  if (!isChannelPlatform(platform)) return { error: "Plataforma inválida." };
  if (!urlOrAppId) return { error: "Informe o link ou ID do canal." };

  const { company } = await requireCompany();
  if (areChannelsLocked(company.is_active)) {
    return {
      error:
        "Para alterar ou incluir novos canais monitorados, entre em contato com o suporte BMG Tech AI.",
    };
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("monitored_channels")
    .select("id, platform")
    .eq("company_id", company.id);
  if (existingError) return { error: existingError.message };

  const requestedTier = String(formData.get("planTier") ?? "");
  const tier: PlanTier = isPlanTier(company.plan_tier)
    ? company.plan_tier
    : isPlanTier(company.plan)
      ? company.plan
      : isPlanTier(requestedTier)
        ? requestedTier
        : "start";
  const limitError = channelLimitError(tier, existing ?? [], platform);
  if (limitError) return { error: limitError };

  const { data: channel, error } = await supabase
    .from("monitored_channels")
    .insert({
      company_id: company.id,
      platform,
      url_or_app_id: urlOrAppId,
      is_active: true,
    })
    .select("id, company_id, platform, url_or_app_id, is_active")
    .single();
  if (error) {
    if (/invalid input value/i.test(error.message)) {
      return {
        error:
          "Falta atualizar o banco. No SQL Editor do Supabase rode: alter table public.monitored_channels alter column platform type text using platform::text;",
      };
    }
    if (error.code === "23505") {
      return { error: "Já existe um canal dessa plataforma." };
    }
    return { error: error.message };
  }

  const load = await collectOneChannel({
    id: channel.id,
    company_id: channel.company_id,
    platform: channel.platform,
    url_or_app_id: channel.url_or_app_id,
    is_active: channel.is_active,
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true as const, message: summarizeChannelCollection(load) };
}

export async function saveWhatsAppAction(formData: FormData) {
  const whatsapp = String(formData.get("whatsapp") ?? "").replace(/\D/g, "");
  const minRating = Number(formData.get("minRating") ?? 2);
  if (whatsapp.length < 10) {
    return { error: "Informe o WhatsApp com DDI, DDD e número." };
  }

  const { company } = await requireCompany();
  const supabase = await createClient();
  const { error } = await supabase.from("alert_settings").upsert(
    {
      company_id: company.id,
      whatsapp_number: whatsapp,
      min_rating_trigger: minRating >= 1 && minRating <= 5 ? minRating : 2,
    },
    { onConflict: "company_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/onboarding");
  revalidatePath("/dashboard/settings");
  return { ok: true as const };
}

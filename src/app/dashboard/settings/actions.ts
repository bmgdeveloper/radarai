"use server";

import { revalidatePath } from "next/cache";
import { requireCompany } from "@/lib/auth/session";
import { areChannelsLocked } from "@/lib/billing/channel-locks";
import { createClient } from "@/lib/supabase/server";
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

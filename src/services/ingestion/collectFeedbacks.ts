import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  fetchReviewsForChannel,
  isSupportedScraperPlatform,
} from "@/services/scrapers";
import type { ChannelPlatform } from "@/services/scrapers/types";
import { processAndSaveFeedbacks } from "./feedbackIngestion";

export type MonitoredChannel = {
  id: string;
  company_id: string;
  platform: ChannelPlatform;
  url_or_app_id: string;
  is_active: boolean;
};

export type ChannelCollectionResult = {
  channelId: string;
  companyId: string;
  platform: ChannelPlatform;
  skipped?: boolean;
  received: number;
  inserted: number;
  duplicates: number;
  alerts: number;
  alertsSent: number;
  error?: string;
};

export type CollectionRunResult = {
  channels: number;
  processed: ChannelCollectionResult[];
  alertsSent: number;
};

type AlertSettingsRow = {
  company_id: string;
  whatsapp_number: string | null;
  min_rating_trigger: number | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
  is_active: boolean;
};

function emptyResult(channel: MonitoredChannel): ChannelCollectionResult {
  return {
    channelId: channel.id,
    companyId: channel.company_id,
    platform: channel.platform,
    received: 0,
    inserted: 0,
    duplicates: 0,
    alerts: 0,
    alertsSent: 0,
  };
}

export async function collectOneChannel(
  channel: MonitoredChannel,
  options?: {
    companyName?: string;
    whatsappNumber?: string | null;
    minRatingTrigger?: number;
  },
): Promise<ChannelCollectionResult> {
  const baseResult = emptyResult(channel);
  if (!isSupportedScraperPlatform(channel.platform)) {
    return { ...baseResult, skipped: true };
  }

  const supabase = createServiceRoleClient();
  try {
    const rawFeedbacks = await fetchReviewsForChannel(
      channel.platform,
      channel.url_or_app_id,
    );
    const ingestion = await processAndSaveFeedbacks(
      channel.company_id,
      channel.id,
      rawFeedbacks,
      {
        supabase,
        minRatingTrigger: options?.minRatingTrigger,
        companyName: options?.companyName,
        whatsappNumber: options?.whatsappNumber ?? null,
      },
    );
    return {
      ...baseResult,
      received: ingestion.received,
      inserted: ingestion.inserted,
      duplicates: ingestion.duplicates,
      alerts: ingestion.alerts.length,
      alertsSent: ingestion.alertsSent,
    };
  } catch (error) {
    return {
      ...baseResult,
      error: error instanceof Error ? error.message : "erro desconhecido",
    };
  }
}

export function summarizeChannelCollection(result: ChannelCollectionResult) {
  if (result.skipped) {
    return "Canal salvo. Esta fonte ainda não tem coleta automática.";
  }
  if (result.error) {
    return `Canal salvo. A primeira carga falhou: ${result.error}`;
  }
  return `Canal salvo. Primeira carga: ${result.inserted} novo(s) de ${result.received} recebido(s).`;
}

export async function collectAndStoreFeedbacks(
  companyId?: string,
): Promise<CollectionRunResult> {
  const supabase = createServiceRoleClient();

  let channelsQuery = supabase
    .from("monitored_channels")
    .select("id, company_id, platform, url_or_app_id, is_active")
    .eq("is_active", true);
  if (companyId) {
    channelsQuery = channelsQuery.eq("company_id", companyId);
  }

  const { data: channels, error: channelsError } = await channelsQuery;

  if (channelsError) {
    throw new Error(`Falha ao buscar canais ativos: ${channelsError.message}`);
  }

  const activeChannels = (channels ?? []) as MonitoredChannel[];
  const companyIds = [...new Set(activeChannels.map((channel) => channel.company_id))];

  const [{ data: companies, error: companiesError }, { data: settings, error: settingsError }] =
    await Promise.all([
      companyIds.length > 0
        ? supabase
            .from("companies")
            .select("id, name, is_active")
            .eq("is_active", true)
            .in("id", companyIds)
        : Promise.resolve({ data: [] as CompanyRow[], error: null }),
      companyIds.length > 0
        ? supabase
            .from("alert_settings")
            .select("company_id, whatsapp_number, min_rating_trigger")
            .in("company_id", companyIds)
        : Promise.resolve({ data: [] as AlertSettingsRow[], error: null }),
    ]);

  if (companiesError) {
    throw new Error(`Falha ao buscar empresas: ${companiesError.message}`);
  }
  if (settingsError) {
    throw new Error(`Falha ao buscar alert_settings: ${settingsError.message}`);
  }

  const companyNameById = new Map(
    ((companies ?? []) as CompanyRow[]).map((company) => [
      company.id,
      company.name?.trim() || "Empresa",
    ]),
  );
  const settingsByCompanyId = new Map(
    ((settings ?? []) as AlertSettingsRow[]).map((row) => [row.company_id, row]),
  );

  const billedCompanyIds = new Set(companyNameById.keys());
  const billedChannels = activeChannels.filter((channel) =>
    billedCompanyIds.has(channel.company_id),
  );

  const processed: ChannelCollectionResult[] = [];
  let alertsSent = 0;

  for (const channel of billedChannels) {
    const companySettings = settingsByCompanyId.get(channel.company_id);
    const result = await collectOneChannel(channel, {
      companyName: companyNameById.get(channel.company_id),
      whatsappNumber: companySettings?.whatsapp_number ?? null,
      minRatingTrigger: companySettings?.min_rating_trigger ?? undefined,
    });
    alertsSent += result.alertsSent;
    processed.push(result);
  }

  return {
    channels: billedChannels.length,
    processed,
    alertsSent,
  };
}

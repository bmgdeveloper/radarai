import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { analyzeFeedbackText } from "@/services/ai/feedbackAnalyzer";
import type { FeedbackAnalysis } from "@/services/ai/types";
import { notifyNegativeFeedback } from "@/services/alerts/whatsappAlerts";
import type { RawFeedback } from "@/services/scrapers/types";

export const DEFAULT_NEGATIVE_RATING = 2;
const EXISTING_ID_CHUNK_SIZE = 100;
const INSERT_CHUNK_SIZE = 50;
const AI_CONCURRENCY = 3;

type FeedbackSentiment = FeedbackAnalysis["sentiment"];

export type SavedFeedback = {
  externalId: string;
  author: string | null;
  rating: number | null;
  text: string | null;
  publishedAt: string | null;
  needsAlert: boolean;
  sentiment: FeedbackSentiment | null;
  category: string | null;
  summary: string | null;
};

export type IngestionResult = {
  received: number;
  inserted: number;
  duplicates: number;
  alerts: SavedFeedback[];
  alertsSent: number;
};

type FeedbackInsertRow = {
  company_id: string;
  channel_id: string;
  external_id: string;
  author: string | null;
  rating: number | null;
  text: string | null;
  sentiment: FeedbackSentiment | null;
  category: string | null;
  summary: string | null;
  needs_alert: boolean;
  published_at: string | null;
};

function namespacedExternalId(companyId: string, externalId: string) {
  return `${companyId}:${externalId}`;
}

function toSavedFeedback(row: FeedbackInsertRow): SavedFeedback {
  return {
    externalId: row.external_id,
    author: row.author,
    rating: row.rating,
    text: row.text,
    publishedAt: row.published_at,
    needsAlert: row.needs_alert,
    sentiment: row.sentiment,
    category: row.category,
    summary: row.summary,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await mapper(items[current]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

async function loadCompanyAlertContext(
  supabase: SupabaseClient,
  companyId: string,
) {
  const [{ data: company, error: companyError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase.from("companies").select("name").eq("id", companyId).maybeSingle(),
      supabase
        .from("alert_settings")
        .select("whatsapp_number, min_rating_trigger")
        .eq("company_id", companyId)
        .maybeSingle(),
    ]);

  if (companyError) {
    throw new Error(`Falha ao ler empresa: ${companyError.message}`);
  }
  if (settingsError) {
    throw new Error(`Falha ao ler alert_settings: ${settingsError.message}`);
  }

  const trigger = settings?.min_rating_trigger;
  const minRatingTrigger =
    typeof trigger === "number" && trigger >= 1 && trigger <= 5
      ? trigger
      : DEFAULT_NEGATIVE_RATING;

  return {
    companyName: company?.name?.trim() || "Empresa",
    whatsappNumber: settings?.whatsapp_number ?? null,
    minRatingTrigger,
  };
}

async function findExistingExternalIds(
  supabase: SupabaseClient,
  externalIds: string[],
): Promise<Map<string, number | null>> {
  const existing = new Map<string, number | null>();

  for (const batch of chunk(externalIds, EXISTING_ID_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("feedbacks")
      .select("external_id, rating")
      .in("external_id", batch);

    if (error) {
      throw new Error(`Falha ao consultar feedbacks existentes: ${error.message}`);
    }

    for (const row of data ?? []) {
      if (typeof row.external_id === "string") {
        existing.set(row.external_id, typeof row.rating === "number" ? row.rating : null);
      }
    }
  }

  return existing;
}

async function analyzeRawFeedback(
  raw: RawFeedback,
  minRatingTrigger: number,
): Promise<Pick<FeedbackInsertRow, "sentiment" | "category" | "summary" | "needs_alert">> {
  const rating = raw.rating ?? 0;
  const analysis = await analyzeFeedbackText(raw.text ?? "", rating);
  const ratingAlert = typeof raw.rating === "number" && raw.rating <= minRatingTrigger;

  return {
    sentiment: analysis.sentiment,
    category: analysis.category,
    summary: analysis.summary,
    needs_alert: analysis.needs_alert || ratingAlert,
  };
}

export async function processAndSaveFeedbacks(
  companyId: string,
  channelId: string,
  rawFeedbacks: RawFeedback[],
  options?: {
    supabase?: SupabaseClient;
    minRatingTrigger?: number;
    companyName?: string;
    whatsappNumber?: string | null;
  },
): Promise<IngestionResult> {
  const supabase = options?.supabase ?? createServiceRoleClient();
  const context = await loadCompanyAlertContext(supabase, companyId);
  const minRatingTrigger = options?.minRatingTrigger ?? context.minRatingTrigger;
  const companyName = options?.companyName ?? context.companyName;
  const whatsappNumber = options?.whatsappNumber ?? context.whatsappNumber;

  const uniqueByExternalId = new Map<string, RawFeedback & { externalId: string }>();

  for (const raw of rawFeedbacks) {
    const sourceId = raw.externalId?.trim();
    if (!sourceId) continue;
    uniqueByExternalId.set(namespacedExternalId(companyId, sourceId), {
      ...raw,
      externalId: namespacedExternalId(companyId, sourceId),
    });
  }

  const candidates = [...uniqueByExternalId.values()];
  const existing = await findExistingExternalIds(
    supabase,
    candidates.map((row) => row.externalId),
  );
  const toInsertRaw = candidates.filter((row) => !existing.has(row.externalId));
  const toUpdateRating = candidates.filter((row) => {
    if (!existing.has(row.externalId)) return false;
    if (typeof row.rating !== "number") return false;
    return existing.get(row.externalId) == null;
  });

  const analyzedRows = await mapWithConcurrency(
    toInsertRaw,
    AI_CONCURRENCY,
    async (raw): Promise<FeedbackInsertRow> => {
      const analysis = await analyzeRawFeedback(raw, minRatingTrigger);
      return {
        company_id: companyId,
        channel_id: channelId,
        external_id: raw.externalId,
        author: raw.author,
        rating: raw.rating,
        text: raw.text,
        published_at: raw.publishedAt,
        ...analysis,
      };
    },
  );

  const inserted: SavedFeedback[] = [];

  for (const batch of chunk(analyzedRows, INSERT_CHUNK_SIZE)) {
    if (batch.length === 0) continue;

    const { error } = await supabase.from("feedbacks").insert(batch);
    if (error?.code === "23505") {
      for (const row of batch) {
        const { error: rowError } = await supabase.from("feedbacks").insert(row);
        if (rowError?.code === "23505") continue;
        if (rowError) {
          throw new Error(`Falha ao inserir feedbacks: ${rowError.message}`);
        }
        inserted.push(toSavedFeedback(row));
      }
      continue;
    }

    if (error) {
      throw new Error(`Falha ao inserir feedbacks: ${error.message}`);
    }

    for (const row of batch) {
      inserted.push(toSavedFeedback(row));
    }
  }

  for (const raw of toUpdateRating) {
    const { error: updateError } = await supabase
      .from("feedbacks")
      .update({ rating: raw.rating })
      .eq("external_id", raw.externalId)
      .is("rating", null);
    if (updateError) {
      throw new Error(`Falha ao atualizar nota do feedback: ${updateError.message}`);
    }
  }

  const alerts = inserted.filter((feedback) => feedback.needsAlert);
  let alertsSent = 0;

  for (const alert of alerts) {
    const sent = await notifyNegativeFeedback({
      companyName,
      whatsappNumber,
      author: alert.author,
      rating: alert.rating,
      text: alert.text,
      summary: alert.summary,
    });
    if (sent) alertsSent += 1;
  }

  return {
    received: rawFeedbacks.length,
    inserted: inserted.length,
    duplicates: candidates.length - toInsertRaw.length,
    alerts,
    alertsSent,
  };
}

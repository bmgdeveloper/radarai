import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelPlatform } from "@/services/scrapers/types";
import {
  DASHBOARD_PAGE_SIZE,
  periodBounds,
  type DashboardFeedback,
  type DashboardFilters,
  type DashboardKpis,
} from "./types";

type FeedbackQueryRow = {
  id: string;
  author: string | null;
  rating: number | null;
  text: string | null;
  sentiment: DashboardFeedback["sentiment"];
  category: string | null;
  summary: string | null;
  needs_alert: boolean;
  published_at: string | null;
  created_at: string;
  monitored_channels: { platform: ChannelPlatform } | { platform: ChannelPlatform }[] | null;
};

function channelPlatform(
  relation: FeedbackQueryRow["monitored_channels"],
): ChannelPlatform {
  if (Array.isArray(relation)) return relation[0]?.platform ?? "google";
  return relation?.platform ?? "google";
}

function applyChannelFilters<T>(query: T, filters: DashboardFilters): T {
  let next = query as T & {
    eq: (column: string, value: string) => T;
    gte: (column: string, value: string) => T;
    lte: (column: string, value: string) => T;
  };
  if (filters.platform) {
    next = next.eq("monitored_channels.platform", filters.platform) as typeof next;
  }
  if (filters.sentiment) {
    next = next.eq("sentiment", filters.sentiment) as typeof next;
  }
  return next;
}

function applyFilters<T>(query: T, filters: DashboardFilters): T {
  const range = periodBounds(filters);
  let next = applyChannelFilters(query, filters) as T & {
    gte: (column: string, value: string) => T;
    lte: (column: string, value: string) => T;
  };
  next = next.gte("published_at", range.start.toISOString()) as typeof next;
  next = next.lte("published_at", range.end.toISOString()) as typeof next;
  return next;
}

export async function loadDashboardData(
  supabase: SupabaseClient,
  filters: DashboardFilters,
  companyId: string,
): Promise<{
  kpis: DashboardKpis;
  feedbacks: DashboardFeedback[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const select = `
    id,
    author,
    rating,
    text,
    sentiment,
    category,
    summary,
    needs_alert,
    published_at,
    created_at,
    monitored_channels!inner ( platform )
  `;

  const page = Math.max(1, filters.page);
  const from = (page - 1) * DASHBOARD_PAGE_SIZE;
  const to = from + DASHBOARD_PAGE_SIZE - 1;

  const listQuery = applyFilters(
    supabase
      .from("feedbacks")
      .select(select, { count: "exact" })
      .eq("company_id", companyId)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to),
    filters,
  );

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthQuery = applyChannelFilters(
    supabase
      .from("feedbacks")
      .select("id, monitored_channels!inner(platform)", {
        count: "exact",
        head: true,
      })
      .eq("company_id", companyId)
      .gte("published_at", monthStart.toISOString()),
    filters,
  );

  const kpiQuery = applyFilters(
    supabase
      .from("feedbacks")
      .select("rating, sentiment, needs_alert, monitored_channels!inner(platform)")
      .eq("company_id", companyId),
    filters,
  );

  const [
    { data, error, count },
    { count: monthCount, error: monthError },
    { data: kpiRows, error: kpiError },
  ] = await Promise.all([listQuery, monthQuery, kpiQuery]);

  if (error) {
    throw new Error(`Falha ao carregar feedbacks: ${error.message}`);
  }
  if (monthError) {
    throw new Error(`Falha ao calcular KPI do mês: ${monthError.message}`);
  }
  if (kpiError) {
    throw new Error(`Falha ao calcular indicadores: ${kpiError.message}`);
  }

  const feedbacks: DashboardFeedback[] = ((data ?? []) as FeedbackQueryRow[]).map(
    (row) => ({
      id: row.id,
      author: row.author,
      rating: row.rating,
      text: row.text,
      sentiment: row.sentiment,
      category: row.category,
      summary: row.summary,
      needsAlert: row.needs_alert,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      platform: channelPlatform(row.monitored_channels),
    }),
  );

  const kpiItems = (kpiRows ?? []) as Array<{
    rating: number | null;
    sentiment: DashboardFeedback["sentiment"];
    needs_alert: boolean;
  }>;
  const rated = kpiItems.filter((item) => typeof item.rating === "number");
  const averageRating =
    rated.length === 0
      ? null
      : rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length;
  const negativeCount = kpiItems.filter((item) => item.sentiment === "NEGATIVO").length;
  const negativePercent =
    kpiItems.length === 0 ? 0 : (negativeCount / kpiItems.length) * 100;
  const alertCount = kpiItems.filter((item) => item.needs_alert).length;

  return {
    kpis: {
      averageRating,
      monthCount: monthCount ?? 0,
      negativePercent,
      alertCount,
    },
    feedbacks,
    total: count ?? 0,
    page,
    pageSize: DASHBOARD_PAGE_SIZE,
  };
}

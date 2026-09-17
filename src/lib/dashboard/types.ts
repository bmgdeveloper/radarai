import { CHANNEL_PLATFORMS, type ChannelPlatform } from "@/services/scrapers/types";
import type { FeedbackSentiment } from "@/services/ai/types";

export type DashboardPeriod = "7d" | "30d" | "month" | "year" | "custom";

export const DASHBOARD_PAGE_SIZE = 20;
export const MAX_PERIOD_DAYS = 365;

export type DashboardFilters = {
  platform?: ChannelPlatform;
  sentiment?: FeedbackSentiment;
  period: DashboardPeriod;
  from?: string;
  to?: string;
  page: number;
};

export type DashboardFeedback = {
  id: string;
  author: string | null;
  rating: number | null;
  text: string | null;
  sentiment: FeedbackSentiment | null;
  category: string | null;
  summary: string | null;
  needsAlert: boolean;
  publishedAt: string | null;
  createdAt: string;
  platform: ChannelPlatform;
};

export type DashboardKpis = {
  averageRating: number | null;
  monthCount: number;
  negativePercent: number;
  alertCount: number;
};

const PLATFORMS: ChannelPlatform[] = [...CHANNEL_PLATFORMS];
const SENTIMENTS: FeedbackSentiment[] = ["POSITIVO", "NEUTRO", "NEGATIVO"];
const PERIODS: DashboardPeriod[] = ["7d", "30d", "month", "year", "custom"];

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateInput(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(from: Date, to: Date) {
  return Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000,
  );
}

export function todayInputValue() {
  return formatDateInput(new Date());
}

export function clampDateRange(from: Date, to: Date): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  let start = startOfDay(from);
  let end = startOfDay(to);
  if (end > today) end = today;
  if (start > end) start = new Date(end);
  if (daysBetween(start, end) > MAX_PERIOD_DAYS) {
    start = addDays(end, -MAX_PERIOD_DAYS);
  }
  return { start, end };
}

export function defaultCustomRange() {
  const today = new Date();
  return {
    from: formatDateInput(addDays(today, -29)),
    to: formatDateInput(today),
  };
}

export function periodBounds(filters: Pick<DashboardFilters, "period" | "from" | "to">) {
  const now = new Date();
  if (filters.period === "custom") {
    const from = parseDateInput(filters.from) ?? addDays(now, -29);
    const to = parseDateInput(filters.to) ?? now;
    const clamped = clampDateRange(from, to);
    return { start: startOfDay(clamped.start), end: endOfDay(clamped.end) };
  }
  if (filters.period === "month") {
    return {
      start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: endOfDay(now),
    };
  }
  if (filters.period === "year") {
    return {
      start: startOfDay(new Date(now.getFullYear(), 0, 1)),
      end: endOfDay(now),
    };
  }
  const days = filters.period === "7d" ? 7 : 30;
  return {
    start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    end: endOfDay(now),
  };
}

export function parseDashboardFilters(
  searchParams: Record<string, string | string[] | undefined>,
): DashboardFilters {
  const platform = firstParam(searchParams.platform);
  const sentiment = firstParam(searchParams.sentiment);
  const rawPeriod = firstParam(searchParams.period);
  const pageRaw = Number(firstParam(searchParams.page) ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const period: DashboardPeriod =
    rawPeriod === "all"
      ? "year"
      : PERIODS.includes(rawPeriod as DashboardPeriod)
        ? (rawPeriod as DashboardPeriod)
        : "month";

  const filters: DashboardFilters = {
    platform: PLATFORMS.includes(platform as ChannelPlatform)
      ? (platform as ChannelPlatform)
      : undefined,
    sentiment: SENTIMENTS.includes(sentiment as FeedbackSentiment)
      ? (sentiment as FeedbackSentiment)
      : undefined,
    period,
    page,
  };

  if (period === "custom") {
    const defaults = defaultCustomRange();
    const clamped = clampDateRange(
      parseDateInput(firstParam(searchParams.from)) ?? parseDateInput(defaults.from)!,
      parseDateInput(firstParam(searchParams.to)) ?? parseDateInput(defaults.to)!,
    );
    filters.from = formatDateInput(clamped.start);
    filters.to = formatDateInput(clamped.end);
  }

  return filters;
}

export function dashboardQueryString(filters: {
  platform?: string;
  sentiment?: string;
  period?: DashboardPeriod;
  from?: string;
  to?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (filters.platform && filters.platform !== "all") {
    params.set("platform", filters.platform);
  }
  if (filters.sentiment && filters.sentiment !== "all") {
    params.set("sentiment", filters.sentiment);
  }
  if (filters.period && filters.period !== "month") {
    params.set("period", filters.period);
  }
  if (filters.period === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }
  return params.toString();
}

export function dashboardHref(filters: {
  platform?: string;
  sentiment?: string;
  period?: DashboardPeriod;
  from?: string;
  to?: string;
  page?: number;
}) {
  const query = dashboardQueryString(filters);
  return query ? `/dashboard?${query}` : "/dashboard";
}

export const PLATFORM_LABELS: Record<ChannelPlatform, string> = {
  playstore: "Play Store",
  appstore: "App Store",
  reclameaqui: "Reclame AQUI",
  consumidorgov: "Consumidor.gov",
  google: "Google",
  ifood: "iFood",
  mercadolivre: "Mercado Livre",
  amazon: "Amazon",
  app99: "99",
};

export const SENTIMENT_LABELS: Record<FeedbackSentiment, string> = {
  POSITIVO: "Positivo",
  NEUTRO: "Neutro",
  NEGATIVO: "Negativo",
};

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  month: "Este mês",
  year: "Este ano",
  custom: "Data customizada",
};

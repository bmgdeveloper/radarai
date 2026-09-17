export const CHANNEL_PLATFORMS = [
  "playstore",
  "appstore",
  "reclameaqui",
  "consumidorgov",
  "google",
  "ifood",
  "mercadolivre",
  "amazon",
  "app99",
] as const;

export type ChannelPlatform = (typeof CHANNEL_PLATFORMS)[number];

export function isChannelPlatform(value: string): value is ChannelPlatform {
  return (CHANNEL_PLATFORMS as readonly string[]).includes(value);
}

export type RawFeedback = {
  externalId: string;
  author: string | null;
  rating: number | null;
  text: string | null;
  publishedAt: string | null;
};

export const DEFAULT_REVIEW_LIMIT = 50;
export const MAX_REVIEW_LIMIT = 200;

export function normalizeLimit(limit = DEFAULT_REVIEW_LIMIT) {
  if (!Number.isFinite(limit)) return DEFAULT_REVIEW_LIMIT;
  return Math.min(MAX_REVIEW_LIMIT, Math.max(1, Math.floor(limit)));
}

export function clampRating(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.round(numeric);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

export function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value < 1_000_000_000_000 ? value * 1000 : value;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    if (/^\d+$/.test(trimmed) && Number.isFinite(numeric)) {
      return toIsoDate(numeric);
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

export function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

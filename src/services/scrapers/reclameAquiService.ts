import { parseReclameAquiSlug } from "./ids";
import { nativeJsonGet, type JsonGet } from "./http";
import {
  clampRating,
  cleanText,
  normalizeLimit,
  toIsoDate,
  type RawFeedback,
} from "./types";

const RECLAME_AQUI_UNAVAILABLE =
  "Não foi possível consultar os dados do Reclame AQUI no momento. Tente novamente em instantes.";

type Card = {
  id?: string | number;
  title?: string;
  titleMasked?: string;
  description?: string;
  descriptionMasked?: string;
  created?: string;
  status?: string;
  url?: string;
  hasReply?: boolean;
  score?: number | null;
  evaluated?: boolean;
  userName?: string | null;
};

function extractCards(payload: unknown): Card[] {
  const root = (payload ?? {}) as Record<string, unknown>;
  const result = (root.complainResult ?? root) as Record<string, unknown>;
  const complains = (result.complains ?? result) as Record<string, unknown>;
  if (Array.isArray(complains.data)) return complains.data as Card[];
  if (Array.isArray(result.data)) return result.data as Card[];
  if (Array.isArray(root.data)) return root.data as Card[];
  if (Array.isArray(payload)) return payload as Card[];
  return [];
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cardText(card: Card): string {
  const candidates = [card.descriptionMasked, card.description, card.titleMasked, card.title]
    .map((value) => stripHtml(String(value ?? "")))
    .filter(Boolean);
  return candidates.sort((a, b) => b.length - a.length)[0] ?? "";
}

function ratingFromReclameAqui(score: unknown): number | null {
  const numeric = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= 0 && numeric <= 10) {
    return clampRating(Math.max(1, Math.round(numeric / 2)));
  }
  return clampRating(numeric);
}

function toFeedback(card: Card): RawFeedback | null {
  const id = cleanText(String(card.id ?? ""));
  if (!id) return null;
  const title = stripHtml(String(card.titleMasked || card.title || ""));
  const body = cardText(card);
  const text = [title, body].filter(Boolean).join("\n") || null;
  const author = cleanText(card.userName);
  const maskedAuthor = !author || /^\*+$/.test(author) ? null : author;

  return {
    externalId: `reclameaqui:${id}`,
    author: maskedAuthor,
    rating: ratingFromReclameAqui(card.score),
    text,
    publishedAt: toIsoDate(card.created),
  };
}

function extractCompanyId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const root = data as Record<string, unknown>;
  const nested =
    root.company && typeof root.company === "object"
      ? (root.company as Record<string, unknown>)
      : undefined;
  const doc = Array.isArray(root.documents)
    ? (root.documents[0] as Record<string, unknown> | undefined)
    : undefined;
  const id =
    root.id ??
    root.companyId ??
    root.idRa ??
    root.companyid ??
    nested?.id ??
    nested?.companyId ??
    doc?.id;
  return id == null || String(id).trim() === "" ? undefined : String(id);
}

async function resolveCompanyId(
  slug: string,
  getJson: JsonGet,
): Promise<string> {
  const publicUrl = `https://iosearch.reclameaqui.com.br/raichannels/v1/company/public/${encodeURIComponent(slug)}`;
  const publicResponse = await getJson(publicUrl);
  if (publicResponse.status < 400 && publicResponse.data) {
    const fromPublic = extractCompanyId(publicResponse.data);
    if (fromPublic) return fromPublic;
  }

  const fallbackUrl = `https://iosite.reclameaqui.com.br/raichu-io-site-v1/company/shortname/${encodeURIComponent(slug)}`;
  const response = await getJson(fallbackUrl);
  if (response.status >= 400 || !response.data || typeof response.data !== "object") {
    throw new Error(RECLAME_AQUI_UNAVAILABLE);
  }
  const id = extractCompanyId(response.data);
  if (!id) {
    throw new Error(RECLAME_AQUI_UNAVAILABLE);
  }
  return id;
}

async function collectPages(
  companyId: string,
  limit: number,
  getJson: JsonGet,
  query = "",
): Promise<RawFeedback[]> {
  const base =
    process.env.RECLAMEAQUI_API_BASE?.trim() ||
    "https://iosearch.reclameaqui.com.br/raichu-io-site-search-v1";
  const pageSize = Math.min(10, limit);
  const maxPages = Math.max(1, Math.ceil(limit / pageSize));
  const collected: RawFeedback[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < maxPages; page += 1) {
    const url = `${base}/query/companyComplains/${pageSize}/${page}?company=${encodeURIComponent(companyId)}${query}`;
    const response = await getJson(url);
    if (response.status >= 400) {
      throw new Error(RECLAME_AQUI_UNAVAILABLE);
    }

    const cards = extractCards(response.data);
    if (cards.length === 0) break;

    for (const card of cards) {
      const item = toFeedback(card);
      if (!item || seen.has(item.externalId)) continue;
      seen.add(item.externalId);
      collected.push(item);
      if (collected.length >= limit) return collected;
    }
  }

  return collected;
}

export async function fetchReclameAquiReviews(
  urlOrSlug: string,
  limit = 50,
  getJson: JsonGet = nativeJsonGet,
): Promise<RawFeedback[]> {
  try {
    const slug = parseReclameAquiSlug(urlOrSlug);
    const companyId = await resolveCompanyId(slug, getJson);
    const num = normalizeLimit(limit);
    const latestLimit = Math.max(1, Math.ceil(num * 0.7));
    const evaluatedLimit = Math.max(1, num - latestLimit);

    const [latest, evaluated] = await Promise.all([
      collectPages(companyId, latestLimit, getJson),
      collectPages(companyId, evaluatedLimit, getJson, "&evaluated=true"),
    ]);

    const merged: RawFeedback[] = [];
    const seen = new Set<string>();
    for (const item of [...latest, ...evaluated]) {
      if (seen.has(item.externalId)) continue;
      seen.add(item.externalId);
      merged.push(item);
    }
    return merged;
  } catch (cause) {
    if (cause instanceof Error && cause.message === RECLAME_AQUI_UNAVAILABLE) {
      throw cause;
    }
    throw new Error(RECLAME_AQUI_UNAVAILABLE);
  }
}

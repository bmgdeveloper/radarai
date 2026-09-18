import { parseReclameAquiSlug } from "./ids";
import {
  clampRating,
  normalizeLimit,
  toIsoDate,
  type RawFeedback,
} from "./types";

const RECLAME_AQUI_UNAVAILABLE =
  "Não foi possível consultar os dados do Reclame AQUI no momento. Tente novamente em instantes.";

/** Headers de navegador — Netlify / Cloudflare. */
const RECLAME_AQUI_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  Origin: "https://www.reclameaqui.com.br",
  Referer: "https://www.reclameaqui.com.br/",
  "Cache-Control": "no-cache",
};

type RaCard = Record<string, unknown>;

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return stripHtml(value);
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function ratingFromReclameAqui(score: unknown): number | null {
  const numeric = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= 0 && numeric <= 10) {
    return clampRating(Math.max(1, Math.round(numeric / 2)));
  }
  return clampRating(numeric);
}

/**
 * Extrai a slug limpa de URL completa ou texto solto.
 * Ex.: .../empresa/mcdonalds/lista-reclamacoes/ → mcdonalds
 */
export function extractReclameAquiSlug(urlOrSlug: string): string {
  return parseReclameAquiSlug(urlOrSlug);
}

async function raFetch(url: string): Promise<{ status: number; data: unknown; text: string }> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    redirect: "follow",
    headers: RECLAME_AQUI_HEADERS,
  });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data, text };
}

function asArray(value: unknown): RaCard[] {
  if (Array.isArray(value)) return value as RaCard[];
  return [];
}

function extractComplaintCards(payload: unknown): RaCard[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as RaCard[];

  const root = payload as Record<string, unknown>;
  const candidates = [
    root.data,
    root.complains,
    root.complaints,
    root.content,
    root.items,
    root.results,
    (root.complainResult as Record<string, unknown> | undefined)?.complains,
    (
      (root.complainResult as Record<string, unknown> | undefined)?.complains as
        | Record<string, unknown>
        | undefined
    )?.data,
    (root.complains as Record<string, unknown> | undefined)?.data,
  ];

  for (const candidate of candidates) {
    const list = asArray(candidate);
    if (list.length > 0) return list;
  }

  if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
    const nested = extractComplaintCards(root.data);
    if (nested.length > 0) return nested;
  }

  return [];
}

function cardToFeedback(card: RaCard, slug: string): RawFeedback | null {
  const id = pickString(
    card.id,
    card.complaintId,
    card.uuid,
    card.hash,
    card.externalId,
  );
  if (!id) return null;

  const title = pickString(card.titleMasked, card.title, card.headline);
  const body = pickString(
    card.descriptionMasked,
    card.description,
    card.content,
    card.text,
    card.complaint,
  );
  const text = [title, body].filter(Boolean).join("\n") || null;
  const author = pickString(
    card.user_name,
    card.userName,
    card.user,
    card.consumerName,
    card.author,
  );
  const maskedAuthor = !author || /^\*+$/.test(author) ? null : author;
  const rating = ratingFromReclameAqui(
    card.score ?? card.rating ?? card.grade ?? card.evaluation,
  );
  const publishedAt = toIsoDate(
    card.created_at ??
      card.createdAt ??
      card.created ??
      card.date ??
      card.published_at ??
      card.publishedAt,
  );

  return {
    externalId: `reclameaqui:${slug}:${id}`,
    author: maskedAuthor,
    rating,
    text,
    publishedAt,
  };
}

function mapComplaints(
  payload: unknown,
  slug: string,
  limit: number,
): RawFeedback[] {
  const cards = extractComplaintCards(payload);
  const collected: RawFeedback[] = [];
  const seen = new Set<string>();

  for (const card of cards) {
    const item = cardToFeedback(card, slug);
    if (!item || seen.has(item.externalId)) continue;
    seen.add(item.externalId);
    collected.push(item);
    if (collected.length >= limit) break;
  }
  return collected;
}

/**
 * Fallback: índices / reputação da empresa pública quando a lista de reclamações falha.
 */
function mapCompanyPublicIndices(
  payload: unknown,
  slug: string,
): RawFeedback[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const company =
    root.company && typeof root.company === "object"
      ? (root.company as Record<string, unknown>)
      : root;

  const nestedComplaints = mapComplaints(payload, slug, 50);
  if (nestedComplaints.length > 0) return nestedComplaints;

  const score =
    company.finalScore ??
    company.score ??
    company.averageScore ??
    company.rating ??
    root.finalScore ??
    root.score;
  const rating = ratingFromReclameAqui(score);
  const name = pickString(company.companyName, company.name, root.name) ?? slug;
  const status = pickString(
    company.statusDescription,
    company.status,
    root.statusDescription,
  );
  const solved = pickString(
    company.solvedPercentual,
    company.solvedPercentage,
    root.solvedPercentual,
  );
  const count = company.count ?? company.totalComplains ?? root.count;

  const parts = [
    `Reputação Reclame AQUI — ${name}`,
    status ? `Status: ${status}` : null,
    rating != null ? `Nota consolidada: ${rating}/5` : null,
    solved ? `Resolvidas: ${solved}%` : null,
    count != null ? `Reclamações indexadas: ${String(count)}` : null,
  ].filter(Boolean);

  if (parts.length <= 1 && rating == null) return [];

  return [
    {
      externalId: `reclameaqui:${slug}:company-index`,
      author: null,
      rating,
      text: parts.join(" · "),
      publishedAt: new Date().toISOString(),
    },
  ];
}

async function fetchRecentComplaints(
  slug: string,
  limit: number,
): Promise<RawFeedback[]> {
  const pageSize = Math.min(15, Math.max(1, limit));
  const url =
    `https://iosearch.reclameaqui.com.br/raichannels/v1/complains/company/` +
    `${encodeURIComponent(slug)}?short=true&offset=0&limit=${pageSize}`;
  const response = await raFetch(url);
  if (response.status !== 200) return [];
  return mapComplaints(response.data, slug, limit);
}

async function fetchCompanyPublicFallback(
  slug: string,
): Promise<RawFeedback[]> {
  const url =
    `https://iosearch.reclameaqui.com.br/raichannels/v1/company/public/` +
    `${encodeURIComponent(slug)}`;
  const response = await raFetch(url);
  if (response.status !== 200) return [];
  return mapCompanyPublicIndices(response.data, slug);
}

export async function fetchReclameAquiReviews(
  urlOrSlug: string,
  limit = 50,
): Promise<RawFeedback[]> {
  try {
    const cleanSlug = extractReclameAquiSlug(urlOrSlug);
    const num = normalizeLimit(limit);

    // Tentativa 1 — reclamações recentes por slug
    const recent = await fetchRecentComplaints(cleanSlug, num);
    if (recent.length > 0) return recent;

    // Tentativa 2 — detalhes públicos da empresa (índices / nested)
    const fallback = await fetchCompanyPublicFallback(cleanSlug);
    if (fallback.length > 0) return fallback;

    throw new Error(RECLAME_AQUI_UNAVAILABLE);
  } catch (cause) {
    if (cause instanceof Error && cause.message === RECLAME_AQUI_UNAVAILABLE) {
      throw cause;
    }
    if (
      cause instanceof Error &&
      /informe o link ou o slug/i.test(cause.message)
    ) {
      throw cause;
    }
    throw new Error(RECLAME_AQUI_UNAVAILABLE);
  }
}

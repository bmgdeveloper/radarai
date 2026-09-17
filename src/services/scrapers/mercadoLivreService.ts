import { parseMercadoLivreItemId } from "./ids";
import {
  cleanText,
  clampRating,
  normalizeLimit,
  toIsoDate,
  type RawFeedback,
} from "./types";

type MercadoLivreReview = {
  id?: number | string;
  title?: string;
  content?: string;
  rate?: number;
  date_created?: string;
};

type MercadoLivreReviewsResponse = {
  reviews?: MercadoLivreReview[];
  error?: string;
  message?: string;
};

function requireAccessToken() {
  const token = process.env.MERCADOLIVRE_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Mercado Livre não configurado: defina MERCADOLIVRE_ACCESS_TOKEN no servidor (app do Radar, não o token da loja).",
    );
  }
  return token;
}

export async function fetchMercadoLivreReviews(
  urlOrId: string,
  limit = 50,
): Promise<RawFeedback[]> {
  const itemId = parseMercadoLivreItemId(urlOrId);
  const token = requireAccessToken();
  const num = normalizeLimit(limit);

  const url = `https://api.mercadolibre.com/reviews/item/${encodeURIComponent(itemId)}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json().catch(() => ({}))) as MercadoLivreReviewsResponse;

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Mercado Livre HTTP ${response.status}. Confira o token do app e o código MLB.`,
    );
  }

  return (data.reviews ?? [])
    .flatMap((review): RawFeedback[] => {
      const sourceId = cleanText(String(review.id ?? ""));
      if (!sourceId) return [];
      const title = cleanText(review.title);
      const body = cleanText(review.content);
      const text = [title, body].filter(Boolean).join("\n") || null;
      return [
        {
          externalId: `mercadolivre:${itemId}:${sourceId}`,
          author: null,
          rating: clampRating(review.rate),
          text,
          publishedAt: toIsoDate(review.date_created),
        },
      ];
    })
    .slice(0, num);
}

import { parseGooglePlaceId } from "./ids";
import {
  cleanText,
  clampRating,
  normalizeLimit,
  toIsoDate,
  type RawFeedback,
} from "./types";

type GooglePlacesReview = {
  author_name?: string;
  rating?: number;
  text?: string;
  time?: number;
  author_url?: string;
};

type GooglePlacesDetailsResponse = {
  status?: string;
  error_message?: string;
  result?: {
    reviews?: GooglePlacesReview[];
  };
};

function requirePlacesApiKey() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Google Places não configurado: defina GOOGLE_PLACES_API_KEY.",
    );
  }
  return apiKey;
}

export async function fetchGooglePlacesReviews(
  placeId: string,
  limit = 50,
): Promise<RawFeedback[]> {
  const resolvedPlaceId = parseGooglePlaceId(placeId);
  const apiKey = requirePlacesApiKey();
  const num = normalizeLimit(limit);

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json",
  );
  url.searchParams.set("place_id", resolvedPlaceId);
  url.searchParams.set("fields", "reviews");
  url.searchParams.set("reviews_sort", "newest");
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json().catch(() => ({}))) as
    GooglePlacesDetailsResponse;

  if (!response.ok) {
    throw new Error(
      `Falha ao consultar Google Places (HTTP ${response.status}).`,
    );
  }

  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(
      data.error_message ||
        `Google Places retornou status ${data.status}.`,
    );
  }

  const reviews = data.result?.reviews ?? [];

  return reviews
    .map((review) => {
      const author = cleanText(review.author_name);
      const publishedAt = toIsoDate(review.time);
      const sourceId =
        publishedAt ||
        [author, cleanText(review.text)].filter(Boolean).join(":");
      if (!sourceId) return null;

      return {
        externalId: `google:${resolvedPlaceId}:${sourceId}`,
        author,
        rating: clampRating(review.rating),
        text: cleanText(review.text),
        publishedAt,
      } satisfies RawFeedback;
    })
    .filter((review): review is RawFeedback => review !== null)
    .slice(0, num);
}

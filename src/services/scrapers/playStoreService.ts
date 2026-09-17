import gplay from "google-play-scraper";
import { parsePlayStoreAppId } from "./ids";
import {
  cleanText,
  clampRating,
  normalizeLimit,
  toIsoDate,
  type RawFeedback,
} from "./types";

export async function fetchPlayStoreReviews(
  appId: string,
  limit = 50,
): Promise<RawFeedback[]> {
  const packageName = parsePlayStoreAppId(appId);
  const num = normalizeLimit(limit);

  const result = await gplay.reviews({
    appId: packageName,
    lang: "pt",
    country: "br",
    sort: gplay.sort.NEWEST,
    num,
  });

  return (result.data ?? [])
    .map((review) => {
      const sourceId = cleanText(review.id);
      if (!sourceId) return null;

      const title = cleanText(review.title);
      const body = cleanText(review.text);
      const text = [title, body].filter(Boolean).join("\n") || null;

      return {
        externalId: `playstore:${sourceId}`,
        author: cleanText(review.userName),
        rating: clampRating(review.score),
        text,
        publishedAt: toIsoDate(review.date),
      } satisfies RawFeedback;
    })
    .filter((review): review is RawFeedback => review !== null)
    .slice(0, num);
}

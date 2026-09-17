import store from "app-store-scraper";
import { parseAppStoreAppId } from "./ids";
import {
  cleanText,
  clampRating,
  normalizeLimit,
  toIsoDate,
  type RawFeedback,
} from "./types";

const APP_STORE_PAGE_SIZE = 50;
const APP_STORE_MAX_PAGES = 10;

export async function fetchAppStoreReviews(
  appId: string,
  limit = 50,
): Promise<RawFeedback[]> {
  const parsed = parseAppStoreAppId(appId);
  const num = normalizeLimit(limit);
  const pagesNeeded = Math.min(
    APP_STORE_MAX_PAGES,
    Math.max(1, Math.ceil(num / APP_STORE_PAGE_SIZE)),
  );

  const collected: RawFeedback[] = [];

  for (let page = 1; page <= pagesNeeded && collected.length < num; page += 1) {
    const reviews = await store.reviews({
      ...parsed,
      country: "br",
      page,
      sort: store.sort.RECENT,
    });

    for (const review of reviews) {
      const sourceId = cleanText(review.id);
      if (!sourceId) continue;

      const title = cleanText(review.title);
      const body = cleanText(review.text);
      const text = [title, body].filter(Boolean).join("\n") || null;

      collected.push({
        externalId: `appstore:${sourceId}`,
        author: cleanText(review.userName),
        rating: clampRating(review.score),
        text,
        publishedAt: toIsoDate(review.updated),
      });

      if (collected.length >= num) break;
    }

    if (reviews.length === 0) break;
  }

  return collected.slice(0, num);
}

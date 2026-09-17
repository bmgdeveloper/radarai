import { fetchAppStoreReviews } from "./appStoreService";
import { fetchConsumidorGovReviews } from "./consumidorGovService";
import { fetchGooglePlacesReviews } from "./googlePlacesService";
import { fetchMercadoLivreReviews } from "./mercadoLivreService";
import { fetchPlayStoreReviews } from "./playStoreService";
import { fetchReclameAquiReviews } from "./reclameAquiService";
import type { ChannelPlatform, RawFeedback } from "./types";

export { fetchAppStoreReviews } from "./appStoreService";
export { fetchConsumidorGovReviews } from "./consumidorGovService";
export { fetchGooglePlacesReviews } from "./googlePlacesService";
export { fetchMercadoLivreReviews } from "./mercadoLivreService";
export { fetchPlayStoreReviews } from "./playStoreService";
export { fetchReclameAquiReviews } from "./reclameAquiService";
export type { ChannelPlatform, RawFeedback } from "./types";

export type ScrapablePlatform =
  | "playstore"
  | "appstore"
  | "google"
  | "reclameaqui"
  | "consumidorgov"
  | "mercadolivre";

const SUPPORTED_PLATFORMS = new Set<ScrapablePlatform>([
  "playstore",
  "appstore",
  "google",
  "reclameaqui",
  "consumidorgov",
  "mercadolivre",
]);

export function isSupportedScraperPlatform(
  platform: string,
): platform is ScrapablePlatform {
  return SUPPORTED_PLATFORMS.has(platform as ScrapablePlatform);
}

export async function fetchReviewsForChannel(
  platform: ChannelPlatform,
  urlOrAppId: string,
  limit = 50,
): Promise<RawFeedback[]> {
  switch (platform) {
    case "playstore":
      return fetchPlayStoreReviews(urlOrAppId, limit);
    case "appstore":
      return fetchAppStoreReviews(urlOrAppId, limit);
    case "google":
      return fetchGooglePlacesReviews(urlOrAppId, limit);
    case "reclameaqui":
      return fetchReclameAquiReviews(urlOrAppId, limit);
    case "consumidorgov":
      return fetchConsumidorGovReviews(urlOrAppId);
    case "mercadolivre":
      return fetchMercadoLivreReviews(urlOrAppId, limit);
    default:
      return [];
  }
}

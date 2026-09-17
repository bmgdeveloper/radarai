declare module "google-play-scraper" {
  export type GooglePlayReview = {
    id: string;
    userName: string;
    userImage?: string;
    date: string;
    score: number;
    scoreText?: string;
    url?: string;
    title?: string | null;
    text: string;
    replyDate?: string | null;
    replyText?: string | null;
    version?: string | null;
    thumbsUp?: number;
    criterias?: Array<{ criteria: string; rating: number }>;
  };

  export const sort: {
    NEWEST: number;
    RATING: number;
    HELPFULNESS: number;
  };

  export function reviews(opts: {
    appId: string;
    lang?: string;
    country?: string;
    sort?: number;
    num?: number;
    paginate?: boolean;
    nextPaginationToken?: string | null;
  }): Promise<{
    data: GooglePlayReview[];
    nextPaginationToken: string | null;
  }>;

  const gplay: {
    reviews: typeof reviews;
    sort: typeof sort;
  };

  export default gplay;
}

declare module "app-store-scraper" {
  export type AppStoreReview = {
    id: string;
    userName: string;
    userUrl?: string;
    version?: string;
    score: number;
    title?: string;
    text: string;
    url?: string;
    updated: string;
  };

  const store: {
    sort: {
      RECENT: string;
      HELPFUL: string;
    };
    reviews: (opts: {
      id?: number | string;
      appId?: string;
      country?: string;
      page?: number;
      sort?: string;
    }) => Promise<AppStoreReview[]>;
  };

  export default store;
}

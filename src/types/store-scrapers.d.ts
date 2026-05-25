declare module "app-store-scraper" {
  const store: {
    reviews: (opts: {
      id: number;
      sort?: unknown;
      page?: number;
      country?: string;
    }) => Promise<
      Array<{
        id: string | number;
        userName?: string;
        score: number;
        text?: string;
        title?: string;
        date?: string | number;
        version?: string;
      }>
    >;
    sort: { RECENT: unknown };
  };
  export default store;
}

declare module "google-play-scraper" {
  const gplay: {
    reviews: (opts: {
      appId: string;
      sort?: unknown;
      num?: number;
      paginate?: boolean;
      nextPaginationToken?: string;
    }) => Promise<{
      data: Array<{
        id: string;
        userName?: string;
        score: number;
        text?: string;
        date?: string | number;
        version?: string;
        thumbsUp?: number;
      }>;
      nextPaginationToken?: string;
    }>;
    sort: { NEWEST: unknown };
  };
  export default gplay;
}

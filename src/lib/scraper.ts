/**
 * Play Store / App Store review scrapers — ported from Groww-Support-PM-Pulsator
 * Phase 2 DataIngestion.
 */

import gplay from "google-play-scraper";
import store from "app-store-scraper";
import { GROWW_APP } from "@/lib/constants";

export interface ScrapedReview {
  platformReviewId: string;
  platform: "android" | "ios";
  authorName: string;
  starRating: number;
  reviewText: string;
  reviewDate: Date;
  deviceInfo: string | null;
  appVersion: string | null;
  osVersion: string | null;
  upvoteCount: number | null;
}

const MAX_REVIEWS_PER_FETCH = 200;

function safeParseDate(value: unknown): Date {
  if (!value) return new Date();
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function fetchAndroidReviews(
  count: number = MAX_REVIEWS_PER_FETCH,
): Promise<ScrapedReview[]> {
  const results: ScrapedReview[] = [];
  let token: string | undefined;
  let remaining = count;

  while (remaining > 0) {
    const batchSize = Math.min(remaining, 150);
    const response = await gplay.reviews({
      appId: GROWW_APP.androidBundleId,
      sort: gplay.sort.NEWEST,
      num: batchSize,
      paginate: true,
      nextPaginationToken: token,
    });

    if (!response.data || response.data.length === 0) break;

    for (const r of response.data) {
      results.push({
        platformReviewId: r.id,
        platform: "android",
        authorName: r.userName || "Anonymous",
        starRating: r.score,
        reviewText: r.text || "",
        reviewDate: safeParseDate(r.date),
        deviceInfo: null,
        appVersion: r.version || null,
        osVersion: null,
        upvoteCount: r.thumbsUp ?? null,
      });
    }

    remaining -= response.data.length;
    token = response.nextPaginationToken as string | undefined;
    if (!token) break;
  }

  return results;
}

export async function fetchIOSReviews(
  count: number = MAX_REVIEWS_PER_FETCH,
): Promise<ScrapedReview[]> {
  const results: ScrapedReview[] = [];
  const pagesNeeded = Math.ceil(count / 50);

  for (let page = 1; page <= pagesNeeded; page++) {
    const reviews = await store.reviews({
      id: Number(GROWW_APP.iosBundleId),
      sort: store.sort.RECENT,
      page,
      country: "in",
    });

    if (!reviews || reviews.length === 0) break;

    for (const r of reviews) {
      results.push({
        platformReviewId: String(r.id),
        platform: "ios",
        authorName: r.userName || "Anonymous",
        starRating: r.score,
        reviewText: r.text || r.title || "",
        reviewDate: safeParseDate(r.date),
        deviceInfo: null,
        appVersion: r.version || null,
        osVersion: null,
        upvoteCount: null,
      });
    }

    if (results.length >= count) break;
  }

  return results.slice(0, count);
}

/**
 * Review sync engine — ported from Groww-Support-PM-Pulsator Phase 2.
 * Fetches Play Store / App Store reviews and upserts into Supabase.
 */

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { redactPII } from "@/lib/compliance";
import { GROWW_APP_ID } from "@/lib/constants";
import { fetchAndroidReviews, fetchIOSReviews, type ScrapedReview } from "@/lib/scraper";

export interface SyncResult {
  platform: "android" | "ios";
  status: "success" | "failed";
  reviewsFetched: number;
  reviewsInserted: number;
  duplicatesSkipped: number;
  errorMessage: string | null;
  retryCount: number;
}

const RETRY_DELAYS = [1000, 4000, 16000];
const MAX_RETRIES = 3;
const BATCH_SIZE = 50;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  platform: "android" | "ios",
  count: number,
): Promise<{ reviews: ScrapedReview[]; retryCount: number }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const reviews =
        platform === "android"
          ? await fetchAndroidReviews(count)
          : await fetchIOSReviews(count);
      return { reviews, retryCount: attempt };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  throw lastError ?? new Error("All retry attempts exhausted");
}

async function insertReviews(
  reviews: ScrapedReview[],
): Promise<{ inserted: number; skipped: number }> {
  const supabase = getSupabaseAdminClient();
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    const batch = reviews.slice(i, i + BATCH_SIZE);
    const rows = batch.map((r) => ({
      app_id:             GROWW_APP_ID,
      platform_review_id: r.platformReviewId,
      platform:           r.platform,
      author_name:        r.authorName,
      star_rating:        r.starRating,
      review_text:        r.reviewText,
      sanitized_text:     redactPII(r.reviewText).text,
      sentiment:          "uncategorized" as const,
      device_info:        r.deviceInfo,
      app_version:        r.appVersion,
      os_version:         r.osVersion,
      upvote_count:       r.upvoteCount ?? 0,
      review_date:        r.reviewDate.toISOString().split("T")[0],
    }));

    const { data, error } = await supabase
      .from("reviews")
      .upsert(rows, { onConflict: "platform_review_id,platform" })
      .select("id");

    if (error) {
      console.error("[sync-engine] batch insert error:", error.message);
      skipped += batch.length;
    } else {
      inserted += data?.length ?? 0;
      skipped += batch.length - (data?.length ?? 0);
    }
  }

  return { inserted, skipped };
}

async function createSyncLog(platform: "android" | "ios"): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sync_logs")
    .insert({
      app_id:          GROWW_APP_ID,
      platform,
      status:          "running",
      reviews_fetched: 0,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create sync log: ${error.message}`);
  return data.id;
}

async function updateSyncLog(
  logId: string,
  update: {
    status: "success" | "failed";
    reviews_fetched: number;
    error_message?: string | null;
    retry_count: number;
  },
): Promise<void> {
  await getSupabaseAdminClient()
    .from("sync_logs")
    .update({ ...update, completed_at: new Date().toISOString() })
    .eq("id", logId);
}

async function updateAppSyncTimestamp(platform: "android" | "ios"): Promise<void> {
  const column = platform === "android" ? "last_android_sync" : "last_ios_sync";
  await getSupabaseAdminClient()
    .from("apps")
    .update({ [column]: new Date().toISOString() })
    .eq("id", GROWW_APP_ID);
}

export async function syncPlatform(
  platform: "android" | "ios",
  count: number = 200,
): Promise<SyncResult> {
  const logId = await createSyncLog(platform);

  try {
    const { reviews, retryCount } = await fetchWithRetry(platform, count);
    const { inserted, skipped } = await insertReviews(reviews);

    await updateSyncLog(logId, {
      status: "success",
      reviews_fetched: inserted,
      retry_count: retryCount,
    });
    await updateAppSyncTimestamp(platform);

    return {
      platform,
      status: "success",
      reviewsFetched: reviews.length,
      reviewsInserted: inserted,
      duplicatesSkipped: skipped,
      errorMessage: null,
      retryCount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateSyncLog(logId, {
      status: "failed",
      reviews_fetched: 0,
      error_message: message,
      retry_count: MAX_RETRIES,
    });

    return {
      platform,
      status: "failed",
      reviewsFetched: 0,
      reviewsInserted: 0,
      duplicatesSkipped: 0,
      errorMessage: message,
      retryCount: MAX_RETRIES,
    };
  }
}

export async function syncAll(
  count: number = 200,
): Promise<{ android: SyncResult; ios: SyncResult }> {
  const [android, ios] = await Promise.all([
    syncPlatform("android", count),
    syncPlatform("ios", count),
  ]);
  return { android, ios };
}

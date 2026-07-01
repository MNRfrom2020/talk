import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DB_NAME = "playback-progress-db";
const DB_VERSION = 1;
const STORE_NAME = "progress";

interface ProgressRecord {
  podcastId: string;
  currentTime: number;
  updatedAt: number; // Date.now()
}

interface ProgressDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: ProgressRecord;
  };
}

const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
const NEAR_END_THRESHOLD = 10; // seconds

let dbPromise: Promise<IDBPDatabase<ProgressDB>> | null = null;

function getDb(): Promise<IDBPDatabase<ProgressDB>> | null {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<ProgressDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "podcastId" });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Get saved playback progress for a podcast.
 * Returns null if not found or if expired (> 30 days old).
 * Expired entries are deleted asynchronously.
 */
export async function getProgress(
  podcastId: string,
): Promise<number | null> {
  const db = getDb();
  if (!db) return null;

  const record = await (await db).get(STORE_NAME, podcastId);
  if (!record) return null;

  // 1-month expiry check
  if (Date.now() - record.updatedAt > EXPIRY_MS) {
    // Delete asynchronously — don't block the caller
    (await db).delete(STORE_NAME, podcastId);
    return null;
  }

  return record.currentTime;
}

/**
 * Save playback progress for a podcast.
 * - If duration - currentTime <= 10, resets to 0 (track considered finished).
 * - Stores the current timestamp for expiry tracking.
 */
export async function saveProgress(
  podcastId: string,
  currentTime: number,
  duration: number,
): Promise<void> {
  const db = getDb();
  if (!db) return;

  // 10-second reset rule
  const effectiveTime =
    duration > 0 && duration - currentTime <= NEAR_END_THRESHOLD
      ? 0
      : currentTime;

  await (await db).put(STORE_NAME, {
    podcastId,
    currentTime: effectiveTime,
    updatedAt: Date.now(),
  });
}

/**
 * Delete saved progress for a single podcast.
 */
export async function deleteProgress(podcastId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await (await db).delete(STORE_NAME, podcastId);
}

/**
 * Remove all progress entries older than 30 days.
 * Call once on app init or periodically.
 */
export async function clearExpiredProgress(): Promise<void> {
  const db = getDb();
  if (!db) return;

  const store = (await db).transaction(STORE_NAME).objectStore(STORE_NAME);
  const expiredBefore = Date.now() - EXPIRY_MS;

  let cursor = await store.openCursor();
  while (cursor) {
    if (cursor.value.updatedAt < expiredBefore) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
}

/**
 * Load all non-expired progress entries.
 * Used on mount to hydrate the in-memory playbackProgress state.
 * Expired entries are deleted as a side effect.
 */
export async function getAllProgress(): Promise<Record<string, number>> {
  const db = getDb();
  if (!db) return {};

  const all = await (await db).getAll(STORE_NAME);
  const now = Date.now();
  const result: Record<string, number> = {};

  for (const record of all) {
    if (now - record.updatedAt <= EXPIRY_MS) {
      result[record.podcastId] = record.currentTime;
    } else {
      // Clean up expired entry asynchronously
      (await db).delete(STORE_NAME, record.podcastId);
    }
  }

  return result;
}

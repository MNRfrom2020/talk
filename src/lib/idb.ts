
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Podcast } from "./types";

const DB_NAME = "audio-db";
const DB_VERSION = 1;
const STORE_NAME = "audios";

interface AudioDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: {
      podcast: Podcast;
      blob: Blob;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<AudioDB>> | null = null;

const getDb = () => {
  if (typeof window === "undefined") {
    // Return a dummy object or null on the server
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB<AudioDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: "podcast.id" });
      },
    });
  }
  return dbPromise;
};

export async function saveAudio(podcast: Podcast, blob: Blob) {
  const db = getDb();
  if (!db) return;
  const dbInstance = await db;
  return dbInstance.put(STORE_NAME, { podcast, blob });
}

export async function getAudio(podcastId: string) {
  const db = getDb();
  if (!db) return null;
  const dbInstance = await db;
  const result = await dbInstance.get(STORE_NAME, podcastId);
  return result?.blob;
}

export async function getDownloadedPodcastIds(): Promise<string[]> {
  const db = getDb();
  if (!db) return [];
  const dbInstance = await db;
  return dbInstance.getAllKeys(STORE_NAME);
}

export async function deleteAudio(podcastId: string) {
  const db = getDb();
  if (!db) return;
  const dbInstance = await db;
  return dbInstance.delete(STORE_NAME, podcastId);
}

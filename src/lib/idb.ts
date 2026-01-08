
import { openDB, type DBSchema } from "idb";
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

const dbPromise = openDB<AudioDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME, { keyPath: "podcast.id" });
  },
});

export async function saveAudio(podcast: Podcast, blob: Blob) {
  const db = await dbPromise;
  return db.put(STORE_NAME, { podcast, blob });
}

export async function getAudio(podcastId: string) {
  const db = await dbPromise;
  const result = await db.get(STORE_NAME, podcastId);
  return result?.blob;
}

export async function getDownloadedPodcastIds(): Promise<string[]> {
  const db = await dbPromise;
  return db.getAllKeys(STORE_NAME);
}

export async function deleteAudio(podcastId: string) {
  const db = await dbPromise;
  return db.delete(STORE_NAME, podcastId);
}

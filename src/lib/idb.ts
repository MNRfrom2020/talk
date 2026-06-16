
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Podcast } from "./types";

const DB_NAME = "audio-db";
const DB_VERSION = 2;
const LEGACY_STORE_NAME = "audios";
const STORE_NAME = "audios_v2";

interface AudioDB extends DBSchema {
  [LEGACY_STORE_NAME]: {
    key: string;
    value: {
      podcast: Podcast;
      blob: Blob;
    };
  };
  [STORE_NAME]: {
    key: string;
    value: {
      id: string;
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
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
};

export async function saveAudio(podcast: Podcast, blob: Blob) {
  const db = getDb();
  if (!db) return;
  const dbInstance = await db;
  return dbInstance.put(STORE_NAME, { id: podcast.id, podcast, blob });
}

export async function getAudio(podcastId: string): Promise<Blob | null> {
  const db = getDb();
  if (!db) return null;
  const dbInstance = await db;
  const result = await dbInstance.get(STORE_NAME, podcastId);
  if (result?.blob) {
    return result.blob;
  }

  if (dbInstance.objectStoreNames.contains(LEGACY_STORE_NAME)) {
    const legacyResult = await dbInstance.get(LEGACY_STORE_NAME, podcastId);
    return legacyResult?.blob ?? null;
  }

  return null;
}

export async function getDownloadedPodcastIds(): Promise<string[]> {
  const db = getDb();
  if (!db) return [];
  const dbInstance = await db;
  const ids = new Set<string>(
    (await dbInstance.getAllKeys(STORE_NAME)).map((id) => String(id)),
  );

  if (dbInstance.objectStoreNames.contains(LEGACY_STORE_NAME)) {
    const legacyIds = await dbInstance.getAllKeys(LEGACY_STORE_NAME);
    legacyIds.forEach((id) => ids.add(String(id)));
  }

  return [...ids];
}

export async function getDownloadedPodcasts(): Promise<Podcast[]> {
  const db = getDb();
  if (!db) return [];
  const dbInstance = await db;
  const podcasts = new Map<string, Podcast>();

  const results = await dbInstance.getAll(STORE_NAME);
  results.forEach((record) => {
    podcasts.set(record.podcast.id, record.podcast);
  });

  if (dbInstance.objectStoreNames.contains(LEGACY_STORE_NAME)) {
    const legacyResults = await dbInstance.getAll(LEGACY_STORE_NAME);
    legacyResults.forEach((record) => {
      podcasts.set(record.podcast.id, record.podcast);
    });
  }

  return [...podcasts.values()];
}

export async function deleteAudio(podcastId: string) {
  const db = getDb();
  if (!db) return;
  const dbInstance = await db;
  await dbInstance.delete(STORE_NAME, podcastId);

  if (dbInstance.objectStoreNames.contains(LEGACY_STORE_NAME)) {
    await dbInstance.delete(LEGACY_STORE_NAME, podcastId);
  }
}

export async function deleteAudios(podcastIds: string[]) {
    const db = getDb();
    if (!db) return;
    const dbInstance = await db;
    const storeNames = [STORE_NAME];

    if (dbInstance.objectStoreNames.contains(LEGACY_STORE_NAME)) {
      storeNames.push(LEGACY_STORE_NAME);
    }

    const tx = dbInstance.transaction(storeNames, 'readwrite');
    await Promise.all(
      podcastIds.flatMap((id) =>
        storeNames.map((storeName) => tx.objectStore(storeName).delete(id)),
      ),
    );
    await tx.done;
}

export type DownloadedAudioBackupRecord = {
  podcast: Podcast;
  mimeType: string;
  base64: string;
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
};

const base64ToBlob = (base64: string, mimeType: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
};

const getAllAudioEntries = async () => {
  const db = getDb();
  if (!db) return [];

  const dbInstance = await db;
  const records = new Map<string, { podcast: Podcast; blob: Blob }>();

  const currentResults = await dbInstance.getAll(STORE_NAME);
  currentResults.forEach((record) => {
    records.set(record.podcast.id, { podcast: record.podcast, blob: record.blob });
  });

  if (dbInstance.objectStoreNames.contains(LEGACY_STORE_NAME)) {
    const legacyResults = await dbInstance.getAll(LEGACY_STORE_NAME);
    legacyResults.forEach((record) => {
      records.set(record.podcast.id, { podcast: record.podcast, blob: record.blob });
    });
  }

  return [...records.values()];
};

export async function exportDownloadedAudiosForBackup(): Promise<DownloadedAudioBackupRecord[]> {
  const entries = await getAllAudioEntries();

  return Promise.all(
    entries.map(async ({ podcast, blob }) => ({
      podcast,
      mimeType: blob.type || "audio/mpeg",
      base64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
    })),
  );
}

export async function clearDownloadedAudios() {
  const db = getDb();
  if (!db) return;

  const dbInstance = await db;
  const storeNames = [STORE_NAME];

  if (dbInstance.objectStoreNames.contains(LEGACY_STORE_NAME)) {
    storeNames.push(LEGACY_STORE_NAME);
  }

  const tx = dbInstance.transaction(storeNames, "readwrite");
  await Promise.all(storeNames.map((storeName) => tx.objectStore(storeName).clear()));
  await tx.done;
}

export async function importDownloadedAudiosFromBackup(
  records: DownloadedAudioBackupRecord[],
) {
  await clearDownloadedAudios();

  for (const record of records) {
    const blob = base64ToBlob(record.base64, record.mimeType);
    await saveAudio(record.podcast, blob);
  }
}


"use client";

import React,
{
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Podcast } from "@/lib/types";

const DB_NAME = "podcast-downloads";
const DB_VERSION = 1;
const STORE_NAME = "podcasts";

interface DownloadContextType {
  downloadedPodcasts: Podcast[];
  downloadingPodcasts: string[];
  downloadPodcast: (podcast: Podcast) => Promise<void>;
  deleteDownloadedPodcast: (podcastId: string) => void;
  getDownloadedPodcast: (
    podcastId: string,
  ) => Promise<{ podcast: Podcast; blob: Blob } | null>;
  isDownloaded: (podcastId: string) => boolean;
}

const DownloadContext = createContext<DownloadContextType | undefined>(
  undefined,
);

export const useDownload = () => {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error("useDownload must be used within a DownloadProvider");
  }
  return context;
};

// --- IndexedDB Helper Functions ---
let db: IDBDatabase;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject("Error opening IndexedDB.");
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = () => {
      const newDb = request.result;
      if (!newDb.objectStoreNames.contains(STORE_NAME)) {
        newDb.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

const getFromDB = <T>(id: string): Promise<T | null> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => {
      reject("Error fetching from IndexedDB.");
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };
  });
};

const getAllFromDB = <T>(): Promise<T[]> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => {
      reject("Error fetching all from IndexedDB.");
    };

    request.onsuccess = () => {
      resolve(request.result || []);
    };
  });
};

const saveToDB = (data: any): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data);

    request.onerror = () => {
      reject("Error saving to IndexedDB.");
    };

    request.onsuccess = () => {
      resolve();
    };
  });
};

const deleteFromDB = (id: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => {
      reject("Error deleting from IndexedDB.");
    };

    request.onsuccess = () => {
      resolve();
    };
  });
};

// --- Provider Component ---
export const DownloadProvider = ({ children }: { children: ReactNode }) => {
  const [downloadedPodcasts, setDownloadedPodcasts] = useState<Podcast[]>([]);
  const [downloadingPodcasts, setDownloadingPodcasts] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadDownloadedPodcasts = async () => {
      try {
        const podcastsFromDB = await getAllFromDB<{ podcast: Podcast }>();
        setDownloadedPodcasts(podcastsFromDB.map((item) => item.podcast));
      } catch (error) {
        console.error("Failed to load downloaded podcasts:", error);
      } finally {
        setIsInitialized(true);
      }
    };
    loadDownloadedPodcasts();
  }, []);

  const isDownloaded = useCallback(
    (podcastId: string) => {
      return downloadedPodcasts.some((p) => p.id === podcastId);
    },
    [downloadedPodcasts],
  );

  const downloadPodcast = useCallback(
    async (podcast: Podcast) => {
      if (downloadingPodcasts.includes(podcast.id) || isDownloaded(podcast.id)) {
        return;
      }

      setDownloadingPodcasts((prev) => [...prev, podcast.id]);

      try {
        const response = await fetch(podcast.audioUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();

        await saveToDB({ id: podcast.id, podcast, blob });

        setDownloadedPodcasts((prev) => [...prev, podcast]);
      } catch (error) {
        console.error(`Failed to download ${podcast.title}:`, error);
        throw error; // Re-throw to be caught by the caller
      } finally {
        setDownloadingPodcasts((prev) => prev.filter((id) => id !== podcast.id));
      }
    },
    [downloadingPodcasts, isDownloaded],
  );

  const deleteDownloadedPodcast = useCallback(async (podcastId: string) => {
    try {
      await deleteFromDB(podcastId);
      setDownloadedPodcasts((prev) => prev.filter((p) => p.id !== podcastId));
    } catch (error) {
      console.error(`Failed to delete ${podcastId}:`, error);
    }
  }, []);

  const getDownloadedPodcast = useCallback(
    (
      podcastId: string,
    ): Promise<{ podcast: Podcast; blob: Blob } | null> => {
      return getFromDB<{ podcast: Podcast; blob: Blob }>(podcastId);
    },
    [],
  );

  if (!isInitialized) {
    return null; // or a loading spinner
  }

  const value = {
    downloadedPodcasts,
    downloadingPodcasts,
    downloadPodcast,
    deleteDownloadedPodcast,
    getDownloadedPodcast,
    isDownloaded,
  };

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  );
};

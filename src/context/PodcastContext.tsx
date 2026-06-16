

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
} from "react";
import type { Podcast } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

interface PodcastMetadata {
  categories: string[];
  artists: string[];
}

interface PodcastContextType {
  podcasts: Podcast[]; // This will now serve as a cache or "Recently Added" list
  metadata: PodcastMetadata | null;
  addPodcast: (podcast: Omit<Podcast, "id">) => void;
  fetchPodcasts: (params: { action: "list"; category?: string; artist?: string; playlist_id?: string; limit?: number; offset?: number }) => Promise<Podcast[]>;
}

const PodcastContext = createContext<PodcastContextType | undefined>(
  undefined,
);

export const usePodcast = () => {
  const context = useContext(PodcastContext);
  if (!context) {
    throw new Error("usePodcast must be used within a PodcastProvider");
  }
  return context;
};

// Map API response to Frontend Podcast type
const mapPodcast = (item: any): Podcast => ({
  ...item,
  id: String(item.id),
  coverArt: item.cover_art,
  coverArtHint: item.cover_art_hint,
  audioUrl: item.audio_url,
  artist: Array.isArray(item.artist) ? item.artist : [item.artist],
  categories: Array.isArray(item.categories) ? item.categories : [item.categories],
});

export const PodcastProvider = ({ children }: { children: ReactNode }) => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [metadata, setMetadata] = useState<PodcastMetadata | null>(null);

  const fetchPodcasts = async (params: any): Promise<Podcast[]> => {
    try {
      const data = await apiClient.get("podcasts.php", params);
      return data.map(mapPodcast);
    } catch (error) {
      console.error("Error fetching podcasts:", error);
      return [];
    }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        // 1. Fetch metadata first to know what sections we can show
        const meta = await apiClient.get("podcasts.php", { action: "meta" });
        setMetadata(meta);

        // 2. Fetch initial "Recently Added" list (first page)
        const initialPodcasts = await fetchPodcasts({ action: "list", limit: 50 });
        setPodcasts(initialPodcasts);
      } catch (error) {
        console.error("Error initializing podcast data:", error);
      }
    };

    initData();
  }, []);

  const addPodcast = async (
    podcast: Omit<Podcast, "id" | "created_at">,
  ) => {
    try {
        const dbData = {
            title: podcast.title,
            artist: podcast.artist,
            categories: podcast.categories,
            cover_art: podcast.coverArt,
            cover_art_hint: podcast.coverArtHint,
            audio_url: podcast.audioUrl,
        };

        const result = await apiClient.post("actions.php?action=save_podcast", dbData);
        
        if (result.message) {
            // Re-fetch "Recently Added"
            const updated = await fetchPodcasts({ action: "list", limit: 50 });
            setPodcasts(updated);
        }
    } catch (error) {
       console.error("Error adding podcast:", error);
    }
  };

  const value = {
    podcasts,
    metadata,
    addPodcast,
    fetchPodcasts,
  };

  return (
    <PodcastContext.Provider value={value}>
      {children}
    </PodcastContext.Provider>
  );
};

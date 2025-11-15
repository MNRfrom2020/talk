
"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useMemo,
} from "react";
import type { Podcast } from "@/lib/podcasts";
import { podcasts as initialPodcasts } from "@/lib/podcasts";

interface PodcastContextType {
  podcasts: Podcast[];
  addPodcast: (podcast: Omit<Podcast, "id">) => void;
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

export const PodcastProvider = ({ children }: { children: ReactNode }) => {
  const [podcasts, setPodcasts] = useState<Podcast[]>(initialPodcasts);

  const sortedPodcasts = useMemo(() => {
    return [...podcasts].sort((a, b) => parseInt(b.id) - parseInt(a.id));
  }, [podcasts]);

  const addPodcast = (podcast: Omit<Podcast, "id">) => {
    const newPodcast: Podcast = {
      ...podcast,
      id: (podcasts.length > 0 ? Math.max(...podcasts.map(p => parseInt(p.id))) + 1 : 1).toString(),
    };
    setPodcasts((prev) => [newPodcast, ...prev]);
  };

  const value = {
    podcasts: sortedPodcasts,
    addPodcast,
  };

  return (
    <PodcastContext.Provider value={value}>
      {children}
    </PodcastContext.Provider>
  );
};

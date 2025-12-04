
"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useMemo,
  useEffect,
} from "react";
import type { Podcast } from "@/lib/types";
import { supabase } from "@/lib/supabase";

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
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);

  useEffect(() => {
    const fetchPodcasts = async () => {
      const { data, error } = await supabase.from("podcasts").select("*").order('id', { ascending: false });

      if (error) {
        console.error("Error fetching podcasts:", error);
      } else {
        // Supabase returns data that might not match the type exactly, especially artist as string[]
        const typedData = data.map(item => ({
          ...item,
          artist: Array.isArray(item.artist) ? item.artist : [item.artist]
        })) as Podcast[];
        setPodcasts(typedData);
      }
    };

    fetchPodcasts();
  }, []);

  const addPodcast = async (podcast: Omit<Podcast, "id">) => {
    const { data, error } = await supabase
      .from("podcasts")
      .insert([podcast])
      .select();

    if (error) {
      console.error("Error adding podcast:", error);
    } else if (data) {
       const newPodcast = data[0] as Podcast;
       // Ensure artist is an array
       newPodcast.artist = Array.isArray(newPodcast.artist) ? newPodcast.artist : [newPodcast.artist];
       setPodcasts((prev) => [newPodcast, ...prev]);
    }
  };

  const value = {
    podcasts,
    addPodcast,
  };

  return (
    <PodcastContext.Provider value={value}>
      {children}
    </PodcastContext.Provider>
  );
};

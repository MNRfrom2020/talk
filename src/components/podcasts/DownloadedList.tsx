
"use client";

import { useEffect, useState } from "react";
import { getDownloadedPodcastIds } from "@/lib/idb";
import { usePodcast } from "@/context/PodcastContext";
import type { Podcast } from "@/lib/types";
import CategorySection from "./CategorySection";

export default function DownloadedList() {
  const { podcasts: allPodcasts } = usePodcast();
  const [downloadedPodcasts, setDownloadedPodcasts] = useState<Podcast[]>([]);

  useEffect(() => {
    async function fetchDownloaded() {
      try {
        const downloadedIds = await getDownloadedPodcastIds();
        const downloaded = allPodcasts.filter((p) =>
          downloadedIds.includes(p.id)
        );
        // Sort by most recently added to the main podcast list
        downloaded.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setDownloadedPodcasts(downloaded);
      } catch (error) {
        console.error("Failed to fetch downloaded podcasts:", error);
      }
    }

    if (allPodcasts.length > 0) {
      const interval = setInterval(fetchDownloaded, 2000); // Poll for changes
      fetchDownloaded(); // Initial fetch
      
      return () => clearInterval(interval); // Cleanup
    }
  }, [allPodcasts]);

  if (downloadedPodcasts.length === 0) {
    return null;
  }

  return <CategorySection title="Downloads" podcasts={downloadedPodcasts} />;
}

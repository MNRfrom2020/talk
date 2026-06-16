

import { useEffect, useState } from "react";
import { getDownloadedPodcasts, getDownloadedPodcastIds } from "@/lib/idb";
import type { Podcast } from "@/lib/types";
import CategorySection from "./CategorySection";

export default function DownloadedList() {
  const [individualDownloads, setIndividualDownloads] = useState<Podcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function filterDownloads() {
      try {
        const downloadedPodcasts = await getDownloadedPodcasts();
        const downloadedPodcastIdsArray = await getDownloadedPodcastIds();
        const downloadedPodcastIds = new Set(downloadedPodcastIdsArray); // Array to Set

        // Get all playlists to check which podcasts belong to downloaded playlists
        const playlistsResponse = await fetch("/api/playlists.php?action=list");
        const playlists = await playlistsResponse.json();
        
        // Find fully downloaded playlists
        const fullyDownloadedPlaylistIds = new Set<string>();
        const fullyDownloadedPodcastIds = new Set<string>();
        
        playlists.forEach((playlist: any) => {
          const podcastIds = playlist.podcast_ids || [];
          if (podcastIds.length > 0 && podcastIds.every((id: string) => downloadedPodcastIds.has(id))) {
            fullyDownloadedPlaylistIds.add(playlist.id);
            // Add all podcast IDs from this playlist to exclusion set
            podcastIds.forEach((id: string) => fullyDownloadedPodcastIds.add(id));
          }
        });

        // Filter out podcasts that belong to fully downloaded playlists
        const individualOnly = downloadedPodcasts.filter(
          podcast => !fullyDownloadedPodcastIds.has(podcast.id)
        );

        // Sorting by created_at (most recent first)
        const sorted = [...individualOnly].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setIndividualDownloads(sorted);
      } catch (error) {
        console.error("Error loading downloads:", error);
      } finally {
        setIsLoading(false);
      }
    }

    // Refresh every few seconds to catch new downloads
    const interval = setInterval(filterDownloads, 3000);
    filterDownloads();

    return () => clearInterval(interval);
  }, []);

  if (isLoading && individualDownloads.length === 0) {
    return null;
  }

  if (individualDownloads.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center opacity-70">
            <p className="text-xl font-medium">No downloads found</p>
            <p className="text-sm">Audios you download will appear here.</p>
        </div>
    );
  }

  return <CategorySection title="Your Downloads" podcasts={individualDownloads} />;
}

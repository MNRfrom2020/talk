
"use client";

import { useEffect, useState } from "react";
import { getDownloadedPodcastIds } from "@/lib/idb";
import { usePodcast } from "@/context/PodcastContext";
import { usePlaylist } from "@/context/PlaylistContext";
import type { Podcast } from "@/lib/types";
import CategorySection from "./CategorySection";

export default function DownloadedList() {
  const { podcasts: allPodcasts } = usePodcast();
  const { playlists, getPodcastsForPlaylist } = usePlaylist();
  const [individualDownloads, setIndividualDownloads] = useState<Podcast[]>([]);

  useEffect(() => {
    async function filterDownloads() {
      if (allPodcasts.length === 0) return;

      const downloadedIds = new Set(await getDownloadedPodcastIds());
      if (downloadedIds.size === 0) {
        setIndividualDownloads([]);
        return;
      }

      const podcastIdToPlaylistIds = new Map<string, string[]>();
      playlists.forEach(p => {
        p.podcast_ids.forEach(podcastId => {
          if (!podcastIdToPlaylistIds.has(podcastId)) {
            podcastIdToPlaylistIds.set(podcastId, []);
          }
          podcastIdToPlaylistIds.get(podcastId)!.push(p.id);
        });
      });

      const fullyDownloadedPlaylistPocastIds = new Set<string>();
      playlists.forEach(p => {
        if (p.podcast_ids.length > 0 && p.podcast_ids.every(id => downloadedIds.has(id))) {
          p.podcast_ids.forEach(id => fullyDownloadedPlaylistPocastIds.add(id));
        }
      });
      
      const individualDownloadIds = Array.from(downloadedIds).filter(id => !fullyDownloadedPlaylistPocastIds.has(id));

      const finalPodcasts = individualDownloadIds
        .map(id => allPodcasts.find(p => p.id === id))
        .filter((p): p is Podcast => !!p);
        
      finalPodcasts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setIndividualDownloads(finalPodcasts);
    }

    const interval = setInterval(filterDownloads, 2000);
    filterDownloads();

    return () => clearInterval(interval);
  }, [allPodcasts, playlists, getPodcastsForPlaylist]);

  if (individualDownloads.length === 0) {
    return null;
  }

  return <CategorySection title="Downloads" podcasts={individualDownloads} />;
}

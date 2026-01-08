
"use client";

import { useEffect, useState } from "react";
import { usePlaylist } from "@/context/PlaylistContext";
import { usePodcast } from "@/context/PodcastContext";
import { getDownloadedPodcastIds } from "@/lib/idb";
import type { Playlist } from "@/lib/types";
import PlaylistCard from "./PlaylistCard";

export default function DownloadedPlaylistSection() {
  const { playlists, getPodcastsForPlaylist } = usePlaylist();
  const { podcasts: allPodcasts } = usePodcast();
  const [downloadedPlaylists, setDownloadedPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    async function fetchAndCheckDownloads() {
      if (playlists.length === 0 || allPodcasts.length === 0) return;

      const downloadedPodcastIds = new Set(await getDownloadedPodcastIds());
      
      const fullyDownloadedPlaylists = playlists.filter(playlist => {
        if (playlist.podcast_ids.length === 0) {
          return false;
        }

        const podcastsInPlaylist = getPodcastsForPlaylist(playlist.id, allPodcasts);
        
        // If some podcasts for the playlist are not in allPodcasts yet, we can't be sure.
        if (podcastsInPlaylist.length !== playlist.podcast_ids.length) {
            return false;
        }

        return podcastsInPlaylist.every(p => downloadedPodcastIds.has(p.id));
      });
      
      setDownloadedPlaylists(fullyDownloadedPlaylists);
    }
    
    const interval = setInterval(fetchAndCheckDownloads, 2000);
    fetchAndCheckDownloads();

    return () => clearInterval(interval);

  }, [playlists, allPodcasts, getPodcastsForPlaylist]);

  if (downloadedPlaylists.length === 0) {
    return null;
  }

  return (
    <section>
       <h2 className="font-headline mb-4 text-2xl font-bold tracking-tight">
          Downloaded Playlists
        </h2>
       <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {downloadedPlaylists.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </section>
  );
}

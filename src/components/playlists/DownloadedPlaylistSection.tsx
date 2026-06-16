

import { useEffect, useState } from "react";
import { usePlaylist } from "@/context/PlaylistContext";
import { getDownloadedPodcastIds } from "@/lib/idb";
import type { Playlist } from "@/lib/types";
import PlaylistCard from "./PlaylistCard";

export default function DownloadedPlaylistSection() {
  const { playlists } = usePlaylist();
  const [downloadedPlaylists, setDownloadedPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    async function fetchAndCheckDownloads() {
      if (playlists.length === 0) return;

      const downloadedPodcastIds = new Set(await getDownloadedPodcastIds());

      // Deduplicate playlists by ID to prevent React key warnings
      const uniquePlaylists = playlists.filter((playlist, index, self) =>
        index === self.findIndex(p => p.id === playlist.id)
      );

      const fullyDownloadedPlaylists = uniquePlaylists.filter(playlist => {
        if (!playlist.podcast_ids || playlist.podcast_ids.length === 0) {
          return false;
        }

        // A playlist is "downloaded" if ALL its podcast_ids exist in the downloads store
        return playlist.podcast_ids.every(id => downloadedPodcastIds.has(id));
      });

      setDownloadedPlaylists(fullyDownloadedPlaylists);
    }

    const interval = setInterval(fetchAndCheckDownloads, 3000);
    fetchAndCheckDownloads();

    return () => clearInterval(interval);

  }, [playlists]);

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

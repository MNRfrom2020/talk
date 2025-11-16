
"use client";

import { usePlaylist } from "@/context/PlaylistContext";
import PlaylistCard from "./PlaylistCard";
import CategorySection from "../podcasts/CategorySection";

export default function PredefinedPlaylistSection() {
  const { playlists } = usePlaylist();

  const predefinedPlaylists = [
    ...playlists.filter((p) => p.isPredefined),
  ].reverse();

  if (predefinedPlaylists.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="font-headline mb-4 text-2xl font-bold tracking-tight">
        Saved Playlists
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {predefinedPlaylists.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </section>
  );
}

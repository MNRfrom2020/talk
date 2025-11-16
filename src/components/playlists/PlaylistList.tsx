
"use client";

import { usePlaylist } from "@/context/PlaylistContext";
import PlaylistCard from "./PlaylistCard";
import { CreatePlaylistDialog } from "./CreatePlaylistDialog";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";

export default function PlaylistList() {
  const { playlists } = usePlaylist();

  const userPlaylists = [...playlists.filter((p) => !p.isPredefined)].reverse();

  if (userPlaylists.length === 0) {
    return null; // Don't render anything if there are no user playlists
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-2xl font-bold tracking-tight">
          Your Playlists
        </h2>
        <CreatePlaylistDialog>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" /> Add
          </Button>
        </CreatePlaylistDialog>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {userPlaylists.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </section>
  );
}

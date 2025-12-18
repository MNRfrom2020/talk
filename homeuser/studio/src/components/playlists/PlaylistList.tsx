
"use client";

import { usePlaylist } from "@/context/PlaylistContext";
import PlaylistCard from "./PlaylistCard";
import { CreatePlaylistDialog } from "./CreatePlaylistDialog";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function PlaylistList() {
  const { playlists, FAVORITES_PLAYLIST_ID } = usePlaylist();
  const { user } = useUser();

  const favoritesPlaylist = playlists.find(
    (p) => p.id === FAVORITES_PLAYLIST_ID
  );
  
  const otherUserPlaylists = playlists
    .filter((p) => p.id !== FAVORITES_PLAYLIST_ID && !p.isPredefined)
    .sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const allUserPlaylists = [
    ...(favoritesPlaylist ? [favoritesPlaylist] : []),
    ...otherUserPlaylists
  ];


  if (allUserPlaylists.length === 0 && user.isGuest) {
    return null; 
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-headline text-2xl font-bold tracking-tight">
          Your Playlists
        </h2>
        <CreatePlaylistDialog>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" /> Add
          </Button>
        </CreatePlaylistDialog>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {allUserPlaylists.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </section>
  );
}

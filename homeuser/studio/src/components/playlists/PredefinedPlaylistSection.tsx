
"use client";

import * as React from "react";
import { usePlaylist } from "@/context/PlaylistContext";
import PlaylistCard from "./PlaylistCard";
import { Button } from "@/components/ui/button";

const getRowLimit = () => {
  if (typeof window === "undefined") {
    return 6; // Default for server-side rendering
  }
  if (window.innerWidth >= 1536) return 6; // 2xl
  if (window.innerWidth >= 1280) return 5; // xl
  if (window.innerWidth >= 1024) return 4; // lg
  if (window.innerWidth >= 768) return 3; // md
  if (window.innerWidth >= 640) return 3; // sm
  return 2; // mobile
};

export default function PredefinedPlaylistSection() {
  const { playlists } = usePlaylist();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [rowLimit, setRowLimit] = React.useState(getRowLimit());

  const favoritePlaylists = playlists.filter((p) => p.isFavorite);

  React.useEffect(() => {
    const handleResize = () => {
      setRowLimit(getRowLimit());
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Set initial value on client-side mount

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (favoritePlaylists.length === 0) {
    return null;
  }

  const displayedPlaylists =
    isExpanded 
      ? favoritePlaylists
      : favoritePlaylists.slice(0, rowLimit);
  const hasMore = favoritePlaylists.length > rowLimit;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-headline text-2xl font-bold tracking-tight">
          Saved Playlists
        </h2>
        {hasMore &&
          (isExpanded ? (
            <Button variant="link" onClick={() => setIsExpanded(false)}>
              Show less
            </Button>
          ) : (
            <Button variant="link" onClick={() => setIsExpanded(true)}>
              See all
            </Button>
          ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {displayedPlaylists.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </section>
  );
}

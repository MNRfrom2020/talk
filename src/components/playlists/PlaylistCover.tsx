


import { ListMusic } from "lucide-react";

import type { Playlist, Podcast } from "@/lib/types";

interface PlaylistCoverProps {
  playlist: Playlist;
  podcasts: Podcast[];
}

export default function PlaylistCover({ playlist, podcasts }: PlaylistCoverProps) {
  const audioCount = playlist.audioCount ?? podcasts.length;
  
  // 1. If the playlist has its own cover, use it.
  // Check both cover and coverArt (API returns coverArt)
  if (playlist.cover || playlist.coverArt) {
    return (
      <div className="h-full w-full">
        <img
          src={playlist.cover || playlist.coverArt}
          alt={playlist.name}
          className="w-full h-full object-cover rounded-md object-cover"
        />
      </div>
    );
  }

  // 2. If the playlist is empty (no audios), show default icon.
  if (audioCount === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-secondary">
        <ListMusic className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  }

  // 3. If no cover, but we have podcasts loaded, use them for display
  if (podcasts.length > 0) {
    // 3a. Less than 4 podcasts: show first podcast's cover
    if (podcasts.length < 4) {
      const coverArt = podcasts[0].coverArt;
      const coverArtHint = podcasts[0].coverArtHint;
      return (
        <div className="h-full w-full">
          <img
            src={coverArt}
            alt={playlist.name}
            className="w-full h-full object-cover rounded-md object-cover"
            data-ai-hint={coverArtHint}
          />
        </div>
      );
    }

    // 3b. 4 or more podcasts: show 4-grid with random selection
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-md">
        {podcasts.slice(0, 4).map((p, index) => (
          <div key={`${p.id}-${index}`} className="relative h-full w-full">
            <img
              src={p.coverArt}
              alt={p.title}
              className="w-full h-full object-cover object-cover"
            />
          </div>
        ))}
      </div>
    );
  }

  // 4. Fallback: Playlist has audios but they're not loaded in context yet
  // Show default icon with audio count
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-md bg-secondary">
      <ListMusic className="h-12 w-12 text-muted-foreground" />
      <span className="mt-2 text-xs text-muted-foreground">{audioCount} audios</span>
    </div>
  );
}

"use client";

import Image from "next/image";
import { ListMusic } from "lucide-react";

import type { Playlist, Podcast } from "@/lib/types";

interface PlaylistCoverProps {
  playlist: Playlist;
  podcasts: Podcast[];
}

export default function PlaylistCover({ playlist, podcasts }: PlaylistCoverProps) {
  // 1. If the playlist has its own cover, use it.
  if (playlist.cover) {
    return (
      <div className="h-full w-full">
        <Image
          src={playlist.cover}
          alt={playlist.name}
          fill
          className="rounded-md object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    );
  }

  // 2. If the playlist is empty and has no cover, show default icon.
  if (podcasts.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-secondary">
        <ListMusic className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  }

  // 3. If no cover, and less than 4 podcasts, show the first podcast's cover.
  if (podcasts.length < 4) {
    const coverArt = podcasts[0].coverArt;
    const coverArtHint = podcasts[0].coverArtHint;
    return (
      <div className="h-full w-full">
        <Image
          src={coverArt}
          alt={playlist.name}
          fill
          className="rounded-md object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          data-ai-hint={coverArtHint}
        />
      </div>
    );
  }

  // 4. If no cover, and 4 or more podcasts, create a grid.
  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-md">
      {podcasts.slice(0, 4).map((p, index) => (
        <div key={`${p.id}-${index}`} className="relative h-full w-full">
            <Image
                src={p.coverArt}
                alt={p.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 17vw"
            />
        </div>
      ))}
    </div>
  );
}

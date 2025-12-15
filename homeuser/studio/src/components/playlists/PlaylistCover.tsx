
"use client";

import Image from "next/image";
import { ListMusic } from "lucide-react";

import type { Playlist, Podcast } from "@/lib/types";

interface PlaylistCoverProps {
  playlist: Playlist;
  podcasts: Podcast[];
}

export default function PlaylistCover({ playlist, podcasts }: PlaylistCoverProps) {
  const coverArt =
    podcasts.length > 0
      ? podcasts[0].coverArt
      : `https://picsum.photos/seed/${playlist.id}/500/500`;
  const coverArtHint =
    podcasts.length > 0
      ? podcasts[0].coverArtHint
      : "abstract art";

  if (playlist.isPredefined) {
     return (
        <Image
          src={coverArt}
          alt={playlist.name}
          fill
          className="rounded-md object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          data-ai-hint={coverArtHint}
        />
     )
  }

  if (podcasts.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-secondary">
        <ListMusic className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  }

  if (podcasts.length < 4) {
    return (
      <div className="h-full w-full">
        <Image
          src={podcasts[0].coverArt}
          alt={playlist.name}
          fill
          className="rounded-md object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          data-ai-hint={podcasts[0].coverArtHint}
        />
      </div>
    )
  }

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

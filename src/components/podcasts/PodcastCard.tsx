"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import type { Podcast } from "@/lib/podcasts";
import { usePlayer } from "@/context/PlayerContext";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PodcastCardProps {
  podcast: Podcast;
}

export default function PodcastCard({ podcast }: PodcastCardProps) {
  const { play, currentTrack, isPlaying } = usePlayer();
  const isActive = currentTrack?.id === podcast.id;

  return (
    <Card className="group relative w-full overflow-hidden border-none bg-card hover:bg-secondary/80 transition-colors duration-300 shadow-lg">
      <button
        className="w-full text-left"
        onClick={() => play(podcast.id)}
        aria-label={`Play ${podcast.title}`}
      >
        <CardContent className="p-4">
          <div className="aspect-square relative mb-4">
            <Image
              src={podcast.coverArt}
              alt={podcast.title}
              fill
              className="rounded-md object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              data-ai-hint={podcast.coverArtHint}
            />
          </div>
          <h3 className="font-semibold truncate text-foreground">
            {podcast.title}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {podcast.artist}
          </p>
        </CardContent>
      </button>
      <div className="absolute bottom-20 right-6">
        <button
          onClick={() => play(podcast.id)}
          aria-label={`Play ${podcast.title}`}
          className={cn(
            "flex items-center justify-center h-12 w-12 bg-accent rounded-full text-accent-foreground shadow-xl transform transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-90",
            { "opacity-100 scale-100": isActive && isPlaying },
          )}
        >
          <Play className="h-6 w-6 fill-current ml-1" />
        </button>
      </div>
    </Card>
  );
}

"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import type { Podcast } from "@/lib/podcasts";
import { usePlayer } from "@/context/PlayerContext";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

interface PodcastCardProps {
  podcast: Podcast;
}

export default function PodcastCard({ podcast }: PodcastCardProps) {
  const { play, currentTrack, isPlaying } = usePlayer();
  const isActive = currentTrack?.id === podcast.id;

  return (
    <Card className="group relative w-full overflow-hidden border-none bg-card shadow-lg transition-colors duration-300 hover:bg-secondary/80">
      <button
        type="button"
        className="w-full text-left"
        onClick={() => play(podcast.id)}
        aria-label={`Play ${podcast.title}`}
      >
        <CardContent className="p-4">
          <div className="relative mb-4 aspect-square">
            <Image
              src={podcast.coverArt}
              alt={podcast.title}
              fill
              className="rounded-md object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              data-ai-hint={podcast.coverArtHint}
            />
          </div>
          <h3 className="h-12 font-semibold text-foreground line-clamp-2">
            {podcast.title}
          </h3>
          <p className="h-5 text-sm text-muted-foreground line-clamp-1">
            {podcast.artist}
          </p>
          <div className="mt-2 flex h-6 flex-wrap gap-1 overflow-hidden">
            {podcast.categories.slice(0, 2).map((category) => (
              <Badge key={category} variant="secondary">
                {category}
              </Badge>
            ))}
          </div>
        </CardContent>
      </button>
      <div className="absolute bottom-24 right-6">
        <button
          type="button"
          onClick={() => play(podcast.id)}
          aria-label={`Play ${podcast.title}`}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xl transform transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-90",
            { "opacity-100 scale-100": isActive && isPlaying },
          )}
        >
          <Play className="ml-1 h-6 w-6 fill-current" />
        </button>
      </div>
    </Card>
  );
}

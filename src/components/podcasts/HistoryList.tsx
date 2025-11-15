"use client";

import Image from "next/image";
import { Play } from "lucide-react";

import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function HistoryList() {
  const { history, play, currentTrack } = usePlayer();

  if (history.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
        <p className="text-muted-foreground">Your listening history is empty.</p>
      </div>
    );
  }

  return (
    <ScrollArea
      className={cn("h-full", {
        "pb-28 md:pb-8": currentTrack,
      })}
    >
      <div className="space-y-2">
        {history.map((podcast) => (
          <div
            key={podcast.id}
            className="flex items-center gap-4 rounded-md p-2 transition-colors hover:bg-secondary/80"
          >
            <Image
              src={podcast.coverArt}
              alt={podcast.title}
              width={56}
              height={56}
              className="aspect-square h-14 w-14 rounded-md object-cover"
              data-ai-hint={podcast.coverArtHint}
            />
            <div className="flex-1">
              <h3 className="font-semibold line-clamp-1">{podcast.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {podcast.artist}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => play(podcast.id)}
              aria-label={`Play ${podcast.title}`}
            >
              <Play className="h-5 w-5" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

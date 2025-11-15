
"use client";

import { usePlayer } from "@/context/PlayerContext";
import { cn } from "@/lib/utils";
import PodcastCard from "./PodcastCard";

export default function HistoryList() {
  const { history, currentTrack } = usePlayer();

  if (history.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
        <p className="text-muted-foreground">Your listening history is empty.</p>
      </div>
    );
  }

  return (
    <section
      className={cn("pb-28 md:pb-8", {
      })}
    >
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        History
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {history.map((podcast) => (
          <PodcastCard key={podcast.id} podcast={podcast} />
        ))}
      </div>
    </section>
  );
}

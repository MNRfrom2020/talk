"use client";

import { usePodcast } from "@/context/PodcastContext";
import PodcastCard from "./PodcastCard";
import { usePlayer } from "@/context/PlayerContext";
import { cn } from "@/lib/utils";

export default function PodcastLibrary() {
  const { podcasts } = usePodcast();
  const { currentTrack } = usePlayer();

  return (
    <main
      className={cn("p-4 sm:p-6 lg:p-8", {
        "pb-28 md:pb-8": currentTrack,
      })}
    >
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        Your Library
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {podcasts.map((podcast) => (
          <PodcastCard key={podcast.id} podcast={podcast} />
        ))}
      </div>
    </main>
  );
}

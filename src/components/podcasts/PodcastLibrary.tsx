"use client";

import { usePodcast } from "@/context/PodcastContext";
import PodcastCard from "./PodcastCard";

export default function PodcastLibrary() {
  const { podcasts } = usePodcast();

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        Your Library
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {podcasts.map((podcast) => (
          <PodcastCard key={podcast.id} podcast={podcast} />
        ))}
      </div>
    </main>
  );
}

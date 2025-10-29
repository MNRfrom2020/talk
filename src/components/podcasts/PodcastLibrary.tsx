"use client";

import { usePlayer } from "@/context/PlayerContext";
import PodcastCard from "./PodcastCard";

export default function PodcastLibrary() {
  const { playlist } = usePlayer();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
      {playlist.map((podcast) => (
        <PodcastCard key={podcast.id} podcast={podcast} />
      ))}
    </div>
  );
}

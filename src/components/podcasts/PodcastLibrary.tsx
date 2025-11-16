
"use client";

import { usePodcast } from "@/context/PodcastContext";
import PodcastCard from "./PodcastCard";
import { usePlayer } from "@/context/PlayerContext";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import type { Podcast } from "@/lib/types";
import { usePlaylist } from "@/context/PlaylistContext";
import PlaylistCard from "../playlists/PlaylistCard";
import CategorySection from "./CategorySection";

export default function PodcastLibrary({
  showTitle = true,
}: {
  showTitle?: boolean;
}) {
  const { podcasts } = usePodcast();
  const { playlists } = usePlaylist();
  const { currentTrack } = usePlayer();

  const predefinedPlaylists = useMemo(() => {
    return [...playlists.filter((p) => p.isPredefined)].sort((a, b) =>
      b.id.localeCompare(a.id),
    );
  }, [playlists]);

  const categories = useMemo(() => {
    const categoryMap = new Map<string, Podcast[]>();
    podcasts.forEach((podcast) => {
      podcast.categories.forEach((category) => {
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)?.push(podcast);
      });
    });
    return Array.from(categoryMap.entries());
  }, [podcasts]);

  return (
    <main
      className={cn("p-4 sm:p-6 lg:p-8", "pb-24 md:pb-8")}
    >
      {showTitle && (
        <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
          Browse All
        </h1>
      )}
      <div className="space-y-8">
        <CategorySection title="Recently Added" podcasts={podcasts} />

        {predefinedPlaylists.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-2xl font-bold tracking-tight">
                Playlists
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {predefinedPlaylists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          </section>
        )}

        {categories.map(([category, categoryPodcasts]) => (
          <CategorySection
            key={category}
            title={category}
            podcasts={categoryPodcasts}
          />
        ))}
      </div>
    </main>
  );
}

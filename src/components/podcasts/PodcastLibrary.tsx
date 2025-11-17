
"use client";

import { usePodcast } from "@/context/PodcastContext";
import PodcastCard from "./PodcastCard";
import { usePlayer } from "@/context/PlayerContext";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import type { Podcast } from "@/lib/types";
import { usePlaylist } from "@/context/PlaylistContext";
import PlaylistCard from "../playlists/PlaylistCard";
import CategorySection from "./CategorySection";
import { useUser } from "@/context/UserContext";
import { Button } from "../ui/button";

import myPlaylistsData from "@/lib/myplaylist.json";
import myAudioData from "@/lib/myaudio.json";


const INITIAL_VISIBLE_CATEGORIES = 10;
const CATEGORY_INCREMENT = 10;

// Fisher-Yates (aka Knuth) Shuffle
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}


export default function PodcastLibrary({
  showTitle = true,
}: {
  showTitle?: boolean;
}) {
  const { podcasts } = usePodcast();
  const { playlists } = usePlaylist();
  const { user } = useUser();
  const [visibleCategories, setVisibleCategories] = useState(
    INITIAL_VISIBLE_CATEGORIES,
  );

  const predefinedPlaylists = useMemo(() => {
    return [...playlists.filter((p) => p.isPredefined)].sort((a, b) =>
      b.id.localeCompare(a.id),
    );
  }, [playlists]);

  const { quranCategory, randomCategories } = useMemo(() => {
    const categoryMap = new Map<string, Podcast[]>();
    podcasts.forEach((podcast) => {
      podcast.categories.forEach((category) => {
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)?.push(podcast);
      });
    });

    const allCategories = Array.from(categoryMap.entries());

    const quranIndex = allCategories.findIndex(([key]) => key === "Quran");
    let quranCategory: [string, Podcast[]] | null = null;
    if (quranIndex > -1) {
      quranCategory = allCategories[quranIndex];
    }
    
    const otherCategories = allCategories.filter(([key]) => key !== "Quran");

    return {
      quranCategory,
      randomCategories: shuffleArray(otherCategories),
    };
  }, [podcasts]);

  const displayedCategories = useMemo(() => {
    return randomCategories.slice(0, visibleCategories);
  }, [randomCategories, visibleCategories]);

  const hasMoreCategories = visibleCategories < randomCategories.length;

  const loadMoreCategories = () => {
    setVisibleCategories(
      (prev) => prev + CATEGORY_INCREMENT,
    );
  };


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

        {quranCategory && (
           <CategorySection
            key={quranCategory[0]}
            title={quranCategory[0]}
            podcasts={quranCategory[1]}
          />
        )}

        {displayedCategories.map(([category, categoryPodcasts]) => (
          <CategorySection
            key={category}
            title={category}
            podcasts={categoryPodcasts}
          />
        ))}

        {hasMoreCategories && (
          <div className="text-center">
            <Button onClick={loadMoreCategories} variant="secondary">
              Show More
            </Button>
          </div>
        )}

      </div>
    </main>
  );
}

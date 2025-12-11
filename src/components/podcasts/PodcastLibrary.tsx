
"use client";

import { usePodcast } from "@/context/PodcastContext";
import PodcastCard from "./PodcastCard";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import type { Podcast } from "@/lib/types";
import { usePlaylist } from "@/context/PlaylistContext";
import PlaylistCard from "../playlists/PlaylistCard";
import CategorySection from "./CategorySection";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";

const INITIAL_VISIBLE_CATEGORIES = 10;
const CATEGORY_INCREMENT = 10;

const getItemsPerRow = () => {
  if (typeof window === "undefined") {
    return 6; // Default for server-side rendering
  }
  if (window.innerWidth >= 1536) return 6; // 2xl
  if (window.innerWidth >= 1280) return 5; // xl
  if (window.innerWidth >= 1024) return 4; // lg
  if (window.innerWidth >= 768) return 3; // md
  if (window.innerWidth >= 640) return 3; // sm
  return 2; // mobile
};


// Fisher-Yates (aka Knuth) Shuffle
function shuffleArray<T>(array: T[]): T[] {
  if (typeof window === "undefined") {
    // Return original array on server
    return array;
  }
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

const Loader = () => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

export default function PodcastLibrary({
  showTitle = true,
}: {
  showTitle?: boolean;
}) {
  const { podcasts } = usePodcast();
  const { playlists } = usePlaylist();
  const [visibleCategories, setVisibleCategories] = useState(
    INITIAL_VISIBLE_CATEGORIES,
  );
  const [shuffledCategories, setShuffledCategories] = useState<[string, Podcast[]][]>([]);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  const [itemsPerRow, setItemsPerRow] = useState(getItemsPerRow());
  const [visiblePlaylistsCount, setVisiblePlaylistsCount] = useState(itemsPerRow);
  const [isPlaylistsExpanded, setIsPlaylistsExpanded] = useState(false);
  

  useEffect(() => {
    setIsClient(true);
  }, []);

  const predefinedPlaylists = useMemo(() => {
    return [...playlists.filter((p) => p.isPredefined)].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
    });
  }, [playlists]);

  const quranCategory = useMemo(() => {
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
    return quranIndex > -1 ? allCategories[quranIndex] : null;
  }, [podcasts]);
  
  useEffect(() => {
     const categoryMap = new Map<string, Podcast[]>();
    podcasts.forEach((podcast) => {
      podcast.categories.forEach((category) => {
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)?.push(podcast);
      });
    });
    const otherCategories = Array.from(categoryMap.entries()).filter(([key]) => key !== "Quran");
    setShuffledCategories(shuffleArray(otherCategories));
  }, [podcasts]);


  const displayedCategories = useMemo(() => {
    return shuffledCategories.slice(0, visibleCategories);
  }, [shuffledCategories, visibleCategories]);

  const hasMoreCategories = visibleCategories < shuffledCategories.length;

  const loadMoreCategories = useCallback(() => {
    if (isLoading) return;
    setIsLoading(true);
    setTimeout(() => {
      setVisibleCategories(
        (prev) => prev + CATEGORY_INCREMENT,
      );
      setIsLoading(false);
    }, 500); // Simulate network delay
  }, [isLoading]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreCategories && !isLoading) {
          loadMoreCategories();
        }
      },
      { rootMargin: "200px" },
    );

    const loader = loaderRef.current;
    if (loader) {
      observer.observe(loader);
    }

    return () => {
      if (loader) {
        observer.unobserve(loader);
      }
    };
  }, [hasMoreCategories, isLoading, loadMoreCategories]);
  
   useEffect(() => {
    const handleResize = () => {
      const newItemsPerRow = getItemsPerRow();
      setItemsPerRow(newItemsPerRow);
      if (!isPlaylistsExpanded) {
        setVisiblePlaylistsCount(newItemsPerRow);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [isPlaylistsExpanded]);

  const displayedPlaylists = predefinedPlaylists.slice(0, visiblePlaylistsCount);
  const hasMorePlaylists = predefinedPlaylists.length > visiblePlaylistsCount;

  const handleTogglePlaylists = () => {
    if (isPlaylistsExpanded) {
      setVisiblePlaylistsCount(itemsPerRow);
    } else {
      setVisiblePlaylistsCount(predefinedPlaylists.length);
    }
    setIsPlaylistsExpanded(!isPlaylistsExpanded);
  };


  if (!isClient) {
    return (
      <main className={cn("p-4 sm:p-6 lg:p-8", "pb-24 md:pb-8")}>
        <Loader />
      </main>
    );
  }

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
              {predefinedPlaylists.length > itemsPerRow && (
                 <Button variant="link" onClick={handleTogglePlaylists}>
                  {isPlaylistsExpanded ? "Show less" : "See all"}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {displayedPlaylists.map((playlist) => (
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

        <div ref={loaderRef}>
           {hasMoreCategories && <Loader />}
        </div>

      </div>
    </main>
  );
}

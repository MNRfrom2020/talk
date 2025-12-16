
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

const INITIAL_VISIBLE_SECTIONS = 10;
const SECTION_INCREMENT = 10;

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
  <div className="col-span-full flex items-center justify-center py-8">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

type Section =
  | { type: "category"; name: string; podcasts: Podcast[] }
  | { type: "artist"; name: string; podcasts: Podcast[] };

export default function PodcastLibrary({
  showTitle = true,
}: {
  showTitle?: boolean;
}) {
  const { podcasts } = usePodcast();
  const { playlists } = usePlaylist();
  const [visibleSections, setVisibleSections] = useState(
    INITIAL_VISIBLE_SECTIONS,
  );
  const [shuffledSections, setShuffledSections] = useState<Section[]>([]);
  const sectionLoaderRef = useRef<HTMLDivElement>(null);
  const [isSectionLoading, setIsSectionLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  const [itemsPerRow, setItemsPerRow] = useState(getItemsPerRow());
  const [visiblePlaylistsCount, setVisiblePlaylistsCount] = useState(itemsPerRow);
  const [isPlaylistsExpanded, setIsPlaylistsExpanded] = useState(false);
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);
  const playlistLoaderRef = useRef<HTMLDivElement>(null);
  

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
    const quranPodcasts = categoryMap.get("Quran");
    return quranPodcasts ? { name: "Quran", podcasts: quranPodcasts } : null;
  }, [podcasts]);
  
  useEffect(() => {
     // Prepare categories
    const categoryMap = new Map<string, Podcast[]>();
    podcasts.forEach((podcast) => {
      podcast.categories.forEach((category) => {
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(podcast);
      });
    });
    const categorySections: Section[] = Array.from(categoryMap.entries())
        .filter(([key]) => key !== "Quran" && key !== "Nasheed") // Exclude Quran and Nasheed categories
        .map(([name, podcasts]) => ({ type: "category", name, podcasts }));
    
     // Prepare artists
    const artistsToExclude = [
      "Dr Muhammad Ibrahim", "Mahmud Huzaifa", "Mazharul Islam",
      "Moeen Uddin", "Usaid Zahid Siddique", "MercifulServant",
    ];
    const artistMap = new Map<string, Podcast[]>();
    podcasts.forEach(p => {
        p.artist.forEach(artist => {
            if (!artistsToExclude.includes(artist)) {
                if (!artistMap.has(artist)) {
                    artistMap.set(artist, []);
                }
                artistMap.get(artist)!.push(p);
            }
        });
    });
    const artistSections: Section[] = Array.from(artistMap.entries())
        .map(([name, podcasts]) => ({ type: "artist", name, podcasts }));

    // Combine and shuffle
    const combinedSections = [...categorySections, ...artistSections];
    setShuffledSections(shuffleArray(combinedSections));
  }, [podcasts]);


  const displayedSections = useMemo(() => {
    return shuffledSections.slice(0, visibleSections);
  }, [shuffledSections, visibleSections]);

  const hasMoreSections = visibleSections < shuffledSections.length;

  const loadMoreSections = useCallback(() => {
    if (isSectionLoading) return;
    setIsSectionLoading(true);
    setTimeout(() => {
      setVisibleSections(
        (prev) => prev + SECTION_INCREMENT,
      );
      setIsSectionLoading(false);
    }, 500); // Simulate network delay
  }, [isSectionLoading]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreSections && !isSectionLoading) {
          loadMoreSections();
        }
      },
      { rootMargin: "200px" },
    );

    const loader = sectionLoaderRef.current;
    if (loader) {
      observer.observe(loader);
    }

    return () => {
      if (loader) {
        observer.unobserve(loader);
      }
    };
  }, [hasMoreSections, isSectionLoading, loadMoreSections]);
  
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

  const handleToggleSeeAllPlaylists = () => {
    if (isPlaylistsExpanded) {
        setIsPlaylistsExpanded(false);
        setVisiblePlaylistsCount(itemsPerRow);
    } else {
        setIsPlaylistsExpanded(true);
        setVisiblePlaylistsCount(itemsPerRow * 3);
    }
  };

  const loadMorePlaylists = useCallback(() => {
    if (isPlaylistLoading) return;
    setIsPlaylistLoading(true);
    setTimeout(() => {
      setVisiblePlaylistsCount(prev => Math.min(prev + itemsPerRow, predefinedPlaylists.length));
      setIsPlaylistLoading(false);
    }, 500); // Simulate network delay
  }, [isPlaylistLoading, itemsPerRow, predefinedPlaylists.length]);

  useEffect(() => {
    if (!isPlaylistsExpanded || !hasMorePlaylists) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePlaylists();
        }
      },
      { rootMargin: "200px" },
    );

    const currentLoaderRef = playlistLoaderRef.current;
    if (currentLoaderRef) {
      observer.observe(currentLoaderRef);
    }

    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef);
      }
    };
  }, [isPlaylistsExpanded, hasMorePlaylists, loadMorePlaylists]);


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
                 <Button variant="link" onClick={handleToggleSeeAllPlaylists}>
                  {isPlaylistsExpanded ? "Show less" : "See all"}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {displayedPlaylists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
               {isPlaylistsExpanded && isPlaylistLoading && <Loader />}
            </div>
             <div ref={playlistLoaderRef} />
          </section>
        )}

        {quranCategory && (
           <CategorySection
            key={quranCategory.name}
            title={quranCategory.name}
            podcasts={quranCategory.podcasts}
          />
        )}

        {displayedSections.map((section) => (
          <CategorySection
            key={`${section.type}-${section.name}`}
            title={section.name}
            podcasts={section.podcasts}
          />
        ))}

        <div ref={sectionLoaderRef}>
           {hasMoreSections && <Loader />}
        </div>

      </div>
    </main>
  );
}

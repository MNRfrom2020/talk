
import { usePodcast } from "@/context/PodcastContext";
import PodcastCard from "./PodcastCard";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import type { Podcast } from "@/lib/types";
import { usePlaylist } from "@/context/PlaylistContext";
import PlaylistCard from "../playlists/PlaylistCard";
import CategorySection from "./CategorySection";
import ForYouSection from "./ForYouSection";
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

type SectionDefinition =
  | { type: "category"; name: string }
  | { type: "artist"; name: string };

export default function PodcastLibrary({
  showTitle = true,
}: {
  showTitle?: boolean;
}) {
  const { podcasts, metadata } = usePodcast();
  const { playlists } = usePlaylist();
  const [visibleSections, setVisibleSections] = useState(
    INITIAL_VISIBLE_SECTIONS,
  );
  const [shuffledSections, setShuffledSections] = useState<SectionDefinition[]>([]);
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
    // 🎯 Filter: Only show playlists that have cover art OR at least 1 audio
    // This ensures playlists with cover art show even if they're empty
    // And playlists with audios show even if cover art is missing
    return [...playlists.filter((p) => p.isPredefined && ((p.audioCount || 0) > 0 || p.coverArt))].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
    });
  }, [playlists]);

  useEffect(() => {
    if (!metadata) return;

    // 🎯 Filter out Quran & Nasheed to avoid duplicates (Quran has fixed section, Nasheed is reserved)
    const filteredCategories = metadata.categories.filter(
      name => name !== 'Quran' && name !== 'Nasheed'
    );

    const categorySections: SectionDefinition[] = filteredCategories.map(name => ({ type: "category", name }));
    const artistSections: SectionDefinition[] = metadata.artists.map(name => ({ type: "artist", name }));

    const combined = [...categorySections, ...artistSections];
    setShuffledSections(shuffleArray(combined));
  }, [metadata]);


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
    }, 500); 
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
    }, 500); 
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
        <hr className="h-20 border-transparent md:hidden" />
        <Loader />
      </main>
    );
  }

  return (
    <main
      className={cn("p-4 sm:p-6 lg:p-8", "pb-24 md:pb-8")}
    >
      <hr className="h-20 border-transparent md:hidden" />
      <div className="space-y-8">
        {showTitle && (
          <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
            Browse All
          </h1>
        )}
        
        {/* Fixed Section 1: Recently Added */}
        <CategorySection title="Recently Added" podcasts={podcasts} type="recent" />

        {/* Fixed Section 2: For You (Personalized Suggestions) */}
        <ForYouSection />

        {/* Fixed Section 3: Playlists */}
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

        {/* Fixed Section 4: Quran */}
        <CategorySection title="Quran" type="quran" name="Quran" />

        {/* Shuffled Dynamic Sections (Lazy Loaded) */}
        {displayedSections.map((section) => (
          <CategorySection
            key={`${section.type}-${section.name}`}
            title={section.name}
            type={section.type}
            name={section.name}
          />
        ))}

        <div ref={sectionLoaderRef}>
           {hasMoreSections && <Loader />}
        </div>

      </div>
<hr className="h-10 border-transparent md:hidden" />
    </main>
  );
}

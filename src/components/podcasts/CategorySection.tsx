

import { useState, useEffect, useRef, useCallback } from "react";
import type { Podcast } from "@/lib/types";
import { Button } from "@/components/ui/button";
import PodcastCard from "./PodcastCard";
import { Loader2 } from "lucide-react";
import { usePodcast } from "@/context/PodcastContext";

const getItemsPerRow = () => {
  if (typeof window === "undefined") {
    return 6;
  }
  if (window.innerWidth >= 1536) return 6;
  if (window.innerWidth >= 1280) return 5;
  if (window.innerWidth >= 1024) return 4;
  if (window.innerWidth >= 768) return 3;
  if (window.innerWidth >= 640) return 3;
  return 2;
};

const Loader = () => (
  <div className="col-span-full flex items-center justify-center py-8">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

export default function CategorySection({
  title,
  podcasts: initialPodcasts, // Optional initial list for "Recently Added"
  type = "category",
  name,
}: {
  title: string;
  podcasts?: Podcast[];
  type?: "category" | "artist" | "recent" | "quran";
  name?: string;
}) {
  const { fetchPodcasts } = usePodcast();
  const [itemsPerRow, setItemsPerRow] = useState(getItemsPerRow());
  const [podcasts, setPodcasts] = useState<Podcast[]>(initialPodcasts || []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async (isInitial = false) => {
    if (isLoading || (!hasMore && !isInitial)) return;
    
    setIsLoading(true);
    const limit = isInitial ? itemsPerRow : itemsPerRow * 4;
    const offset = isInitial ? 0 : podcasts.length;

    let params: any = { action: "list", limit, offset };
    if (type === "category" || type === "quran") params.category = name || title;
    if (type === "artist") params.artist = name || title;

    const newItems = await fetchPodcasts(params);
    
    if (isInitial) {
        setPodcasts(newItems);
    } else {
        setPodcasts(prev => [...prev, ...newItems]);
    }

    setHasMore(newItems.length >= limit);
    setIsLoading(false);
  }, [isLoading, hasMore, itemsPerRow, type, name, title, podcasts.length, fetchPodcasts]);

  useEffect(() => {
    // Only fetch if we don't have initial podcasts or if it's a specific category/artist
    if (!initialPodcasts || initialPodcasts.length === 0) {
        loadData(true);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setItemsPerRow(getItemsPerRow());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  const handleSeeAll = () => {
    setIsExpanded(true);
    if (podcasts.length <= itemsPerRow) {
        loadData();
    }
  };
  
  const handleShowLess = () => {
    setIsExpanded(false);
  };

  const displayedPodcasts = isExpanded ? podcasts : podcasts.slice(0, itemsPerRow);

  useEffect(() => {
    if (!isExpanded || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          loadData();
        }
      },
      { rootMargin: "200px" },
    );

    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef) {
      observer.observe(currentLoaderRef);
    }

    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef);
      }
    };
  }, [isExpanded, hasMore, isLoading, loadData]);

  if (podcasts.length === 0 && !isLoading) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-headline text-2xl font-bold tracking-tight">
          {title}
        </h2>
        {hasMore && !isExpanded ? (
            <Button variant="link" onClick={handleSeeAll}>
              See all
            </Button>
          ) : isExpanded ? (
            <Button variant="link" onClick={handleShowLess}>
              Show less
            </Button>
          ) : null}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {displayedPodcasts.map((podcast) => (
          <PodcastCard
            key={`${title}-${podcast.id}`}
            podcast={podcast}
            playlist={podcasts}
          />
        ))}
        {isLoading && <Loader />}
      </div>
       <div ref={loaderRef} />
    </section>
  );
}

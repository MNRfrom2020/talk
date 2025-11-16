
"use client";

import { useState, useEffect } from "react";
import type { Podcast } from "@/lib/types";
import { Button } from "@/components/ui/button";
import PodcastCard from "./PodcastCard";

const getRowLimit = () => {
  if (typeof window === "undefined") {
    return null;
  }
  if (window.innerWidth >= 1536) return 6; // 2xl
  if (window.innerWidth >= 1280) return 5; // xl
  if (window.innerWidth >= 1024) return 4; // lg
  if (window.innerWidth >= 768) return 3; // md
  if (window.innerWidth >= 640) return 3; // sm
  return 2; // mobile
};

export default function CategorySection({
  title,
  podcasts,
}: {
  title: string;
  podcasts: Podcast[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rowLimit, setRowLimit] = useState<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setRowLimit(getRowLimit());
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Set initial value on client-side mount

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const displayedPodcasts =
    isExpanded || rowLimit === null ? podcasts : podcasts.slice(0, rowLimit);
  const hasMore = rowLimit !== null && podcasts.length > rowLimit;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-2xl font-bold tracking-tight">
          {title}
        </h2>
        {hasMore &&
          (isExpanded ? (
            <Button variant="link" onClick={() => setIsExpanded(false)}>
              Show less
            </Button>
          ) : (
            <Button variant="link" onClick={() => setIsExpanded(true)}>
              See all
            </Button>
          ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {displayedPodcasts.map((podcast) => (
          <PodcastCard key={`${title}-${podcast.id}`} podcast={podcast} />
        ))}
      </div>
    </section>
  );
}

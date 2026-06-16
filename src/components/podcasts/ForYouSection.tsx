
import { useEffect, useState, useMemo } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { usePodcast } from "@/context/PodcastContext";
import type { Podcast } from "@/lib/types";
import CategorySection from "./CategorySection";

export default function ForYouSection() {
  const { history } = usePlayer();
  const { fetchPodcasts } = usePodcast();
  const [suggestions, setSuggestions] = useState<Podcast[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const topInterests = useMemo(() => {
    if (history.length === 0) return null;

    const categoryCounts: Record<string, number> = {};
    const artistCounts: Record<string, number> = {};

    history.forEach((p) => {
      p.categories.forEach((cat) => {
        if (cat === "Quran") return; // Skip Quran as it has its own fixed section
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      p.artist.forEach((art) => {
        artistCounts[art] = (artistCounts[art] || 0) + 1;
      });
    });

    // Sort and get top interests
    const sortedCats = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    const sortedArts = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]);

    return {
      categories: sortedCats.slice(0, 2).map(([name]) => name),
      artists: sortedArts.slice(0, 2).map(([name]) => name),
    };
  }, [history]);

  useEffect(() => {
    if (!topInterests || history.length === 0) return;

    const loadSuggestions = async () => {
      setIsLoading(true);
      try {
        const allSuggestions: Podcast[] = [];
        const seenIds = new Set(history.map(p => p.id));

        // Fetch from top categories
        for (const cat of topInterests.categories) {
          const items = await fetchPodcasts({ action: "list", category: cat, limit: 10 });
          items.forEach(item => {
            if (!seenIds.has(item.id)) {
              allSuggestions.push(item);
              seenIds.add(item.id);
            }
          });
        }

        // Fetch from top artists
        for (const art of topInterests.artists) {
          const items = await fetchPodcasts({ action: "list", artist: art, limit: 10 });
          items.forEach(item => {
            if (!seenIds.has(item.id)) {
              allSuggestions.push(item);
              seenIds.add(item.id);
            }
          });
        }

        // Shuffle and limit to 12
        const shuffled = allSuggestions.sort(() => Math.random() - 0.5).slice(0, 12);
        setSuggestions(shuffled);
      } catch (error) {
        console.error("Error loading 'For You' suggestions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSuggestions();
  }, [topInterests, history, fetchPodcasts]);

  if (history.length === 0 || (suggestions.length === 0 && !isLoading)) {
    return null;
  }

  return (
    <CategorySection 
      title="For You" 
      podcasts={suggestions} 
    />
  );
}


"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { Play, Search } from "lucide-react";

import { usePodcast } from "@/context/PodcastContext";
import { usePlayer } from "@/context/PlayerContext";
import type { Podcast } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function SearchDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Podcast[]>([]);
  const { podcasts } = usePodcast();
  const { play } = usePlayer();

  useEffect(() => {
    if (searchQuery.length > 2) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const results = podcasts.filter(
        (podcast) =>
          podcast.title.toLowerCase().includes(lowerCaseQuery) ||
          podcast.artist.some((artist) =>
            artist.toLowerCase().includes(lowerCaseQuery),
          ) ||
          podcast.categories.some((cat) =>
            cat.toLowerCase().includes(lowerCaseQuery),
          ) ||
          podcast.coverArtHint.toLowerCase().includes(lowerCaseQuery),
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, podcasts]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open]);

  const handlePlayAndClose = (podcastId: string) => {
    play(podcastId, podcasts);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="top-4 max-w-lg translate-y-0 overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Podcasts</DialogTitle>
          <DialogDescription>
            Search for podcasts by title, artist, or category.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-4 border-b p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for podcasts, artists, or categories..."
              className="h-12 pl-10 text-lg"
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {searchResults.length > 0 ? (
            <ul className="space-y-2">
              {searchResults.map((podcast) => (
                <li key={podcast.id} className="group flex items-center gap-4 rounded-md p-2 transition-colors hover:bg-secondary">
                  <Image
                    src={podcast.coverArt}
                    alt={podcast.title}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-md"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{podcast.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {podcast.artist.join(", ")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePlayAndClose(podcast.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Play className="h-5 w-5 fill-current" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            searchQuery.length > 2 && (
              <p className="py-8 text-center text-muted-foreground">
                No results found for &quot;{searchQuery}&quot;
              </p>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

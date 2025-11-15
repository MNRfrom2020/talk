"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { Play, Search, X } from "lucide-react";

import { usePodcast } from "@/context/PodcastContext";
import { usePlayer } from "@/context/PlayerContext";
import type { Podcast } from "@/lib/podcasts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
          podcast.artist.toLowerCase().includes(lowerCaseQuery) ||
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="h-screen max-h-screen w-screen max-w-full overflow-y-auto !rounded-none !border-none bg-background p-0">
        <div className="sticky top-0 z-10 bg-background/80 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for podcasts, artists, or categories..."
                className="h-12 pl-10 text-lg"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-12 w-12"
            >
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        <div className="p-4 pt-0">
          {searchResults.length > 0 ? (
            <ul className="space-y-4">
              {searchResults.map((podcast) => (
                <li key={podcast.id} className="flex items-center gap-4">
                  <Image
                    src={podcast.coverArt}
                    alt={podcast.title}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-md"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{podcast.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {podcast.artist}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => play(podcast.id)}
                  >
                    <Play className="h-5 w-5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            searchQuery.length > 2 && (
              <p className="text-center text-muted-foreground">
                No results found for &quot;{searchQuery}&quot;
              </p>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

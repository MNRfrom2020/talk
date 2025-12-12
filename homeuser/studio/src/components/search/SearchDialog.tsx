
"use client";

import { useState, useEffect, type ReactNode, type MouseEvent } from "react";
import Image from "next/image";
import {
  Play,
  Search,
  ListPlus,
  Plus,
  Heart,
  MoreVertical,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreatePlaylistDialog } from "@/components/playlists/CreatePlaylistDialog";
import { usePlaylist } from "@/context/PlaylistContext";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";

const SearchResultItem = ({
  podcast,
  onPlay,
}: {
  podcast: Podcast;
  onPlay: (trackId: string) => void;
}) => {
  const { user } = useUser();
  const { addToQueue } = usePlayer();
  const {
    playlists,
    addPodcastToGuestPlaylist,
    addPodcastToUserPlaylist,
    toggleFavoritePodcast,
    isFavoritePodcast,
    FAVORITES_PLAYLIST_ID,
  } = usePlaylist();
  const { toast } = useToast();

  const isFavorite = isFavoritePodcast(podcast.id);
  const userPlaylists = playlists.filter(
    (p) => !p.isPredefined && p.id !== FAVORITES_PLAYLIST_ID,
  );

  const handleAddToQueue = (e: MouseEvent) => {
    e.stopPropagation();
    addToQueue(podcast);
    toast({
      title: "Added to Queue",
      description: `"${podcast.title}" has been added to your playing queue.`,
    });
  };

  const handleToggleFavorite = (e: MouseEvent) => {
    e.stopPropagation();
    toggleFavoritePodcast(podcast.id);
    toast({
      title: isFavorite ? "Removed from Favorites" : "Added to Favorites",
      description: `"${podcast.title}" has been ${
        isFavorite ? "removed from" : "added to"
      } your Favorites.`,
    });
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="group flex items-center gap-4 rounded-md p-2 transition-colors hover:bg-secondary"
    >
      <Image
        src={podcast.coverArt}
        alt={podcast.title}
        width={56}
        height={56}
        className="h-14 w-14 rounded-md object-cover"
      />
      <div className="flex-1 overflow-hidden">
        <h3 className="truncate font-semibold">{podcast.title}</h3>
        <p className="truncate text-sm text-muted-foreground">
          {Array.isArray(podcast.artist)
            ? podcast.artist.join(", ")
            : podcast.artist || "Unknown Artist"}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPlay(podcast.id)}
          className="h-9 w-9 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Play className="h-5 w-5 fill-current" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            onClick={(e) => e.stopPropagation()}
            align="end"
          >
            <DropdownMenuItem onClick={handleAddToQueue}>
              <ListPlus className="mr-2 h-4 w-4" />
              Add to Queue
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleFavorite}>
              <Heart
                className={cn(
                  "mr-2 h-4 w-4",
                  isFavorite && "fill-primary text-primary",
                )}
              />
              {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Add to Playlist</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {userPlaylists.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => {
                       const addFunction = user.isGuest
                        ? addPodcastToGuestPlaylist
                        : addPodcastToUserPlaylist;
                      addFunction(p.id, podcast.id);
                       toast({
                        title: "Added to playlist",
                        description: `"${podcast.title}" has been added to "${p.name}".`,
                      });
                    }}
                  >
                    {p.name}
                  </DropdownMenuItem>
                ))}
                {userPlaylists.length > 0 && <DropdownMenuSeparator />}
                <CreatePlaylistDialog>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Playlist
                  </DropdownMenuItem>
                </CreatePlaylistDialog>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.li>
  );
};

const Placeholder = () => (
  <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
    <Search className="h-16 w-16 text-muted-foreground/30" />
    <h3 className="text-lg font-semibold">Search for Audios</h3>
    <p className="max-w-xs text-sm text-muted-foreground">
      Find your favorite audios, artists, and categories in an instant.
    </p>
  </div>
);

const NoResults = ({ query }: { query: string }) => (
  <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
    <h3 className="text-lg font-semibold">No results found</h3>
    <p className="max-w-xs text-sm text-muted-foreground">
      Sorry, we couldn’t find anything for &quot;{query}&quot;. Try a different
      search.
    </p>
  </div>
);

export function SearchDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Podcast[]>([]);
  const { podcasts } = usePodcast();
  const { play } = usePlayer();

  useEffect(() => {
    if (searchQuery.length > 2) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const results = podcasts.filter((podcast) => {
        const artistMatch = Array.isArray(podcast.artist)
          ? podcast.artist.some((artist) =>
              artist.toLowerCase().includes(lowerCaseQuery),
            )
          : podcast.artist?.toLowerCase().includes(lowerCaseQuery);

        return (
          podcast.title.toLowerCase().includes(lowerCaseQuery) ||
          artistMatch ||
          podcast.categories.some((cat) =>
            cat.toLowerCase().includes(lowerCaseQuery),
          ) ||
          podcast.coverArtHint.toLowerCase().includes(lowerCaseQuery)
        );
      });
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
      <DialogContent className="top-4 max-w-lg translate-y-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Audios</DialogTitle>
          <DialogDescription>
            Search for audios by title, artist, or category.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-4 border-b p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for audios, artists, or categories..."
              className="h-12 pl-10 pr-10 text-lg"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4">
            {searchQuery.length <= 2 ? (
              <Placeholder />
            ) : searchResults.length > 0 ? (
              <ul className="space-y-2">
                <AnimatePresence>
                  {searchResults.map((podcast) => (
                    <SearchResultItem
                      key={podcast.id}
                      podcast={podcast}
                      onPlay={handlePlayAndClose}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <NoResults query={searchQuery} />
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

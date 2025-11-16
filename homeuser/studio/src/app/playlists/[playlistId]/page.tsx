
"use client";

import { AnimatePresence } from "framer-motion";
import AppSidebar from "@/components/layout/AppSidebar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import PodcastCard from "@/components/podcasts/PodcastCard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import MobileHeader from "@/components/layout/MobileHeader";
import { usePlaylist } from "@/context/PlaylistContext";
import { usePodcast } from "@/context/PodcastContext";
import { Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import *s React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface PlaylistPageProps {
  params: {
    playlistId: string;
  };
}

const PlaylistPage = ({ params }: PlaylistPageProps) => {
  const { playlistId } = params;
  const {
    getPlaylistById,
    getPodcastsForPlaylist,
    toggleFavorite,
    removePodcastFromPlaylist,
  } = usePlaylist();
  const { podcasts: allPodcasts } = usePodcast();
  const { toast } = useToast();

  const [sortOrder, setSortOrder] = React.useState("newest");
  const [searchTerm, setSearchTerm] = React.useState("");

  const playlist = getPlaylistById(playlistId);

  const podcastsInPlaylist = React.useMemo(() => {
    let podcasts = getPodcastsForPlaylist(playlistId, allPodcasts);

    // Filter logic
    if (searchTerm) {
      podcasts = podcasts.filter((p) =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Sort logic
    switch (sortOrder) {
      case "a-z":
        podcasts.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "z-a":
        podcasts.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "oldest":
        // Assuming podcastIds in playlist are chronologically added
        break;
      case "newest":
      default:
        podcasts.reverse(); // Newest first
        break;
    }
    return podcasts;
  }, [
    playlistId,
    allPodcasts,
    sortOrder,
    searchTerm,
    getPodcastsForPlaylist,
  ]);

  const handleToggleFavorite = () => {
    if (playlist) {
      toggleFavorite(playlist.id);
      toast({
        title: playlist.isFavorite ? "Removed from Saved" : "Added to Saved",
        description: `"${playlist.name}" has been ${
          playlist.isFavorite ? "removed from" : "added to"
        } your saved playlists.`,
      });
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Playlist link has been copied to your clipboard.",
    });
  };

  if (!playlist) {
    return (
      <SidebarProvider>
        <div className="flex h-screen flex-col bg-background">
          <MobileHeader />
          <div className="flex flex-1 overflow-hidden">
            <AppSidebar />
            <SidebarInset className="flex flex-1 flex-col items-center justify-center">
              <h1 className="font-headline text-3xl font-bold tracking-tight">
                Playlist not found
              </h1>
              <p className="text-muted-foreground">
                This playlist may have been deleted or does not exist.
              </p>
            </SidebarInset>
          </div>
          <AnimatePresence>
            <Player />
          </AnimatePresence>
          <BottomNavBar />
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col bg-background">
        <MobileHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <ScrollArea className="h-full">
              <main className="p-4 sm:p-6 lg:p-8">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h1 className="font-headline text-3xl font-bold tracking-tight">
                      {playlist.name}
                    </h1>
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggleFavorite}
                        aria-label={
                          playlist.isFavorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                      >
                        <Heart
                          className={cn(
                            "h-6 w-6",
                            playlist.isFavorite && "fill-primary text-primary",
                          )}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleShare}
                        aria-label="Share Playlist"
                      >
                        <Share2 className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Filter in this playlist..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-48"
                    />
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest Added</SelectItem>
                        <SelectItem value="oldest">Oldest Added</SelectItem>
                        <SelectItem value="a-z">A-Z</SelectItem>
                        <SelectItem value="z-a">Z-A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {podcastsInPlaylist.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 pb-24 sm:grid-cols-3 md:grid-cols-4 md:pb-8 lg:grid-cols-5 xl:grid-cols-6">
                    {podcastsInPlaylist.map((podcast) => (
                      <PodcastCard
                        key={podcast.id}
                        podcast={podcast}
                        playlist={podcastsInPlaylist}
                        playlistId={playlist.id}
                        onRemove={removePodcastFromPlaylist}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
                    <p className="text-muted-foreground">
                      This playlist is empty. Add some podcasts to get started.
                    </p>
                  </div>
                )}
              </main>
            </ScrollArea>
          </SidebarInset>
        </div>
        <AnimatePresence>
          <Player />
        </AnimatePresence>
        <BottomNavBar />
      </div>
    </SidebarProvider>
  );
};

export default PlaylistPage;

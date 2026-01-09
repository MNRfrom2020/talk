
"use client";

import { AnimatePresence } from "framer-motion";
import AppSidebar from "@/components/layout/AppSidebar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import PodcastCard from "@/components/podcasts/PodcastCard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import MobileHeader from "@/components/layout/MobileHeader";
import { cn } from "@/lib/utils";
import * as React from "react";
import type { Podcast } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { usePodcast } from "@/context/PodcastContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlaylist } from "@/context/PlaylistContext";
import PlaylistCard from "@/components/playlists/PlaylistCard";
import ResumePlayButton from "@/components/player/ResumePlayButton";

export const runtime = 'edge';

interface ArtistPageProps {
  params: Promise<{
    artistName: string;
  }>;
}

const ArtistPage = ({ params }: ArtistPageProps) => {
  const { artistName: encodedArtistName } = React.use(params);
  const artistName = decodeURIComponent(encodedArtistName);
  const { isExpanded, play } = usePlayer();
  const { podcasts: allPodcasts } = usePodcast();
  const { playlists: allPlaylists, getPodcastsForPlaylist } = usePlaylist();

  const [sortOrder, setSortOrder] = React.useState("newest");
  const [searchTerm, setSearchTerm] = React.useState("");

  const podcastsByArtist = React.useMemo(() => {
    let podcasts = allPodcasts.filter((p) => {
      if (Array.isArray(p.artist)) {
        return p.artist.includes(artistName);
      }
      return p.artist === artistName;
    });

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
        podcasts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "newest":
      default:
        podcasts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    return podcasts;
  }, [artistName, sortOrder, searchTerm, allPodcasts]);

  const playlistsByArtist = React.useMemo(() => {
    return allPlaylists.filter(playlist => {
      const playlistPodcasts = getPodcastsForPlaylist(playlist.id, allPodcasts);
      return playlistPodcasts.some(p => p.artist.includes(artistName));
    })
  }, [artistName, allPlaylists, getPodcastsForPlaylist, allPodcasts]);

  const handlePlayAll = () => {
    if (podcastsByArtist.length > 0) {
      play(podcastsByArtist[0].id, podcastsByArtist, { expand: true });
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col bg-background">
        <MobileHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <ScrollArea className="h-full">
              <main className={cn("p-4 sm:p-6 lg:p-8", "pb-24 md:pb-8")}>
              <hr className="h-20 border-transparent md:hidden" />
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <h1 className="font-headline text-3xl font-bold tracking-tight">
                      {artistName}
                    </h1>
                     {podcastsByArtist.length > 0 && (
                      <Button onClick={handlePlayAll} size="sm" className="rounded-full">
                        <Play className="mr-2 h-4 w-4 fill-current" />
                        Play all
                      </Button>
                    )}
                  </div>
                </div>

                <Tabs defaultValue="audios" className="w-full">
                  <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <TabsList>
                      <TabsTrigger value="audios">Audio</TabsTrigger>
                      <TabsTrigger value="playlists">Playlist</TabsTrigger>
                    </TabsList>
                     <div className="flex w-full gap-2 md:w-auto">
                      <Input
                        placeholder="Filter in this artist..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-48"
                      />
                      <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className="w-full md:w-32">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest</SelectItem>
                          <SelectItem value="oldest">Oldest</SelectItem>
                          <SelectItem value="a-z">A-Z</SelectItem>
                          <SelectItem value="z-a">Z-A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <TabsContent value="audios">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {podcastsByArtist.map((podcast) => (
                        <PodcastCard key={podcast.id} podcast={podcast} playlist={podcastsByArtist}/>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="playlists">
                     {playlistsByArtist.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                          {playlistsByArtist.map((playlist) => (
                            <PlaylistCard key={playlist.id} playlist={playlist} />
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
                          <p className="text-muted-foreground">No playlists found for this artist.</p>
                        </div>
                      )}
                  </TabsContent>
                </Tabs>
                <hr className="h-20 border-transparent md:hidden" />
              </main>
            </ScrollArea>
          </SidebarInset>
        </div>
        <AnimatePresence>
          <Player />
        </AnimatePresence>
        <ResumePlayButton />
        {!isExpanded && <BottomNavBar />}
      </div>
    </SidebarProvider>
  );
};

export default ArtistPage;

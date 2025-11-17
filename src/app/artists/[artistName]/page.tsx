
"use client";

import { AnimatePresence } from "framer-motion";
import AppSidebar from "@/components/layout/AppSidebar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import PodcastCard from "@/components/podcasts/PodcastCard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { podcasts as allPodcasts } from "@/lib/podcasts";
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

interface ArtistPageProps {
  params: Promise<{
    artistName: string;
  }>;
}

const ArtistPage = ({ params }: ArtistPageProps) => {
  const { artistName: encodedArtistName } = React.use(params);
  const artistName = decodeURIComponent(encodedArtistName);

  const [sortOrder, setSortOrder] = React.useState("newest");
  const [searchTerm, setSearchTerm] = React.useState("");

  const podcastsByArtist = React.useMemo(() => {
    let podcasts = allPodcasts.filter((p) => p.artist.includes(artistName));

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
        podcasts.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        break;
      case "newest":
      default:
        podcasts.sort((a, b) => parseInt(b.id) - parseInt(a.id));
        break;
    }
    return podcasts;
  }, [artistName, sortOrder, searchTerm]);

  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col bg-background">
        <MobileHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <ScrollArea className="h-full">
              <main className={cn("p-4 sm:p-6 lg:p-8", "pb-24 md:pb-8")}>
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <h1 className="font-headline text-3xl font-bold tracking-tight">
                    {artistName}
                  </h1>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Filter in this artist..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-48"
                    />
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-32">
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

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {podcastsByArtist.map((podcast) => (
                    <PodcastCard key={podcast.id} podcast={podcast} />
                  ))}
                </div>
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

export default ArtistPage;

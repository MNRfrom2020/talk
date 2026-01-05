
"use client";

import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import AppSidebar from "@/components/layout/AppSidebar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { usePodcast } from "@/context/PodcastContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import MobileHeader from "@/components/layout/MobileHeader";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/context/PlayerContext";

const ArtistsPage = () => {
  const { isExpanded } = usePlayer();
  const { podcasts } = usePodcast();

  const artistsToExclude = [
    "Mahmud Huzaifa",
    "Mazharul Islam",
    "Moeen Uddin",
    "Usaid Zahid Siddique",
    "MercifulServant",
  ];

  const allArtists = Array.from(
    new Set(podcasts.flatMap((p) => p.artist)),
  )
    .filter((artist) => !artistsToExclude.includes(artist))
    .sort();

  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col bg-background">
        <MobileHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <ScrollArea className="h-full">
              <main
                className={cn(
                  "space-y-8 p-4 sm:p-6 lg:p-8",
                  "pb-24 md:pb-8",
                )}
              >
                <hr className="h-10 border-transparent md:hidden" />
                <div>
                  <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
                    Artists
                  </h1>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {allArtists.map((artist) => (
                      <Link
                        href={`/artists/${encodeURIComponent(artist)}`}
                        key={artist}
                        passHref
                      >
                        <Card className="grid h-full min-h-24 place-items-center bg-secondary p-4 text-center font-semibold text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
                          {artist}
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
                <hr className="h-10 border-transparent md:hidden" />
              </main>
            </ScrollArea>
          </SidebarInset>
        </div>
        <AnimatePresence>
          <Player />
        </AnimatePresence>
        {!isExpanded && <BottomNavBar />}
      </div>
    </SidebarProvider>
  );
};

export default ArtistsPage;

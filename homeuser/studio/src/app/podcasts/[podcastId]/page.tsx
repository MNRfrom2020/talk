
"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

import { podcasts as allPodcasts } from "@/lib/podcasts";
import { usePlayer } from "@/context/PlayerContext";
import AppSidebar from "@/components/layout/AppSidebar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import MobileHeader from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PodcastPageProps {
  params: {
    podcastId: string;
  };
}

const PodcastPage = ({ params }: PodcastPageProps) => {
  const { podcastId } = params;
  const { play, autoPlay } = usePlayer();
  const podcast = allPodcasts.find((p) => p.id === podcastId);

  useEffect(() => {
    if (podcast) {
      autoPlay(podcast.id);
    }
  }, [podcast, autoPlay]);

  if (!podcast) {
    return (
      <SidebarProvider>
        <div className="flex h-screen flex-col bg-background">
          <MobileHeader />
          <div className="flex flex-1 overflow-hidden">
            <AppSidebar />
            <SidebarInset className="flex flex-1 flex-col items-center justify-center">
              <h1 className="font-headline text-3xl font-bold tracking-tight">
                Podcast not found
              </h1>
              <p className="text-muted-foreground">
                This podcast may have been deleted or does not exist.
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
                <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 md:flex-row md:items-start">
                  <div className="relative aspect-square w-full max-w-xs shrink-0">
                    <Image
                      src={podcast.coverArt}
                      alt={podcast.title}
                      fill
                      className="rounded-lg object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="flex flex-col items-center text-center md:items-start md:text-left">
                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Podcast
                    </p>
                    <h1 className="mt-2 font-headline text-4xl font-bold tracking-tight">
                      {podcast.title}
                    </h1>
                    <h2 className="mt-4 text-xl font-medium text-muted-foreground">
                      {podcast.artist}
                    </h2>
                    <div className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
                      {podcast.categories.map((category) => (
                        <div
                          key={category}
                          className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                        >
                          {category}
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={() => play(podcast.id)}
                      className="mt-8 h-12 rounded-full px-8 text-lg"
                    >
                      <Play className="mr-2 h-5 w-5 fill-current" />
                      Play
                    </Button>
                  </div>
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

export default PodcastPage;

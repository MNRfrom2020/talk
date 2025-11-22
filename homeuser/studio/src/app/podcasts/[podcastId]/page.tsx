
"use client";

import { AnimatePresence } from "framer-motion";
import * as React from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { usePlayer } from "@/context/PlayerContext";
import AppSidebar from "@/components/layout/AppSidebar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import MobileHeader from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePodcast } from "@/context/PodcastContext";
import CategorySection from "@/components/podcasts/CategorySection";
import { Separator } from "@/components/ui/separator";

interface PodcastPageProps {
  params: Promise<{
    podcastId: string;
  }>;
}

const PodcastPage = ({ params }: PodcastPageProps) => {
  const { podcastId } = React.use(params);
  const { play, autoPlay, isExpanded } = usePlayer();
  const { podcasts: allPodcasts } = usePodcast();
  const podcast = allPodcasts.find((p) => p.id === podcastId);

  const searchParams = useSearchParams();
  const isEmbedView = searchParams.get("embed") === "true";
  
  const [showFullApp, setShowFullApp] = React.useState(!isEmbedView);

  const handlePlayFromEmbed = () => {
    setShowFullApp(true);
    play(podcast!.id, allPodcasts, { expand: true });
  };
  
  const relatedPodcasts = React.useMemo(() => {
    if (!podcast) return [];
    
    const podcastArtists = Array.isArray(podcast.artist) ? podcast.artist : [podcast.artist];

    const related = allPodcasts.filter(p => {
      if (p.id === podcast.id) return false;
      const pArtists = Array.isArray(p.artist) ? p.artist : [p.artist];

      const hasCommonArtist = pArtists.some(artist => podcastArtists.includes(artist));
      const hasCommonCategory = p.categories.some(category => podcast.categories.includes(category));
      
      return hasCommonArtist || hasCommonCategory;
    });

    // Simple scoring to rank related podcasts
    related.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      const aArtists = Array.isArray(a.artist) ? a.artist : [a.artist];
      const bArtists = Array.isArray(b.artist) ? b.artist : [b.artist];

      if (aArtists.some(artist => podcastArtists.includes(artist))) scoreA += 2;
      if (bArtists.some(artist => podcastArtists.includes(artist))) scoreB += 2;
      
      scoreA += a.categories.filter(category => podcast.categories.includes(category)).length;
      scoreB += b.categories.filter(category => podcast.categories.includes(category)).length;

      return scoreB - scoreA;
    });
    
    return related.slice(0, 12); // Limit to 12 related podcasts
  }, [podcast, allPodcasts]);


  React.useEffect(() => {
    if (podcast && !isEmbedView) {
      autoPlay(podcast.id, allPodcasts);
    }
  }, [podcast, autoPlay, allPodcasts, isEmbedView]);

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
          {!isExpanded && <BottomNavBar />}
        </div>
      </SidebarProvider>
    );
  }
  
  const artistText = Array.isArray(podcast.artist) ? podcast.artist.join(", ") : (podcast.artist || "Unknown Artist");


  if (isEmbedView && !showFullApp) {
    return (
      <div className="relative flex h-screen flex-col bg-background">
        <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden p-8">
          <div className="relative w-full max-w-sm shrink-0 aspect-square">
            <Image
              src={podcast.coverArt}
              alt={podcast.title}
              fill
              className="rounded-md object-cover"
            />
          </div>
          <div className="w-full max-w-sm text-center">
            <h3 className="text-2xl font-bold">{podcast.title}</h3>
            <p className="text-base text-muted-foreground">{artistText}</p>
          </div>
           <Button
              onClick={handlePlayFromEmbed}
              className="mt-8 h-12 rounded-full px-8 text-lg"
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              Play
            </Button>
        </div>
        <AnimatePresence>
          <Player />
        </AnimatePresence>
      </div>
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
              <main className="space-y-8 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
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
                       {artistText}
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
                      onClick={() => play(podcast.id, allPodcasts, { expand: true })}
                      className="mt-8 h-12 rounded-full px-8 text-lg"
                    >
                      <Play className="mr-2 h-5 w-5 fill-current" />
                      Play
                    </Button>
                  </div>
                </div>

                {relatedPodcasts.length > 0 && (
                   <div className="mx-auto max-w-6xl">
                     <Separator className="my-8"/>
                     <CategorySection title="Related Audios" podcasts={relatedPodcasts} />
                   </div>
                )}
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

export default PodcastPage;

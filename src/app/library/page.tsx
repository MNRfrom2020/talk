
"use client";

export const runtime = 'edge';

import { AnimatePresence } from "framer-motion";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import AppSidebar from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import HistoryList from "@/components/podcasts/HistoryList";
import { ScrollArea } from "@/components/ui/scroll-area";
import MobileHeader from "@/components/layout/MobileHeader";
import { CreatePlaylistDialog } from "@/components/playlists/CreatePlaylistDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import PlaylistList from "@/components/playlists/PlaylistList";
import PredefinedPlaylistSection from "@/components/playlists/PredefinedPlaylistSection";
import { cn } from "@/lib/utils";
import CategorySection from "@/components/podcasts/CategorySection";
import { usePlayer } from "@/context/PlayerContext";
import DownloadedList from "@/components/podcasts/DownloadedList";
import DownloadedPlaylistSection from "@/components/playlists/DownloadedPlaylistSection";
import ResumePlayButton from "@/components/player/ResumePlayButton";

export default function LibraryPage() {
  const { isExpanded } = usePlayer();
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
                  "p-4 sm:p-6 lg:p-8",
                  "pb-24 md:pb-8",
                )}
              >
                <hr className="h-20 border-transparent md:hidden" />
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h1 className="font-headline text-3xl font-bold tracking-tight">
                      Your Library
                    </h1>
                    <CreatePlaylistDialog>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" /> New Playlist
                      </Button>
                    </CreatePlaylistDialog>
                  </div>

                  <HistoryList />
                  
                  <DownloadedList />

                  <PredefinedPlaylistSection />
                  
                  <DownloadedPlaylistSection />

                  <PlaylistList />
                </div>
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
}

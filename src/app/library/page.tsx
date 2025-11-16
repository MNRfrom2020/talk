
"use client";

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
import { Separator } from "@/components/ui/separator";
import PredefinedPlaylistSection from "@/components/playlists/PredefinedPlaylistSection";

export default function LibraryPage() {
  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col bg-background">
        <MobileHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <ScrollArea className="h-full">
              <main className="space-y-8 p-4 sm:p-6 lg:p-8">
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

                <PredefinedPlaylistSection />

                <PlaylistList />
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
}

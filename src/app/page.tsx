
"use client";

export const runtime = 'edge';

import { AnimatePresence } from "framer-motion";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import PodcastLibrary from "@/components/podcasts/PodcastLibrary";
import AppSidebar from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import MobileHeader from "@/components/layout/MobileHeader";
import { usePlayer } from "@/context/PlayerContext";

export default function Home() {
  const { isExpanded } = usePlayer();
  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col bg-background">
        <MobileHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <ScrollArea className="h-full">
              <PodcastLibrary showTitle={false} />
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
}

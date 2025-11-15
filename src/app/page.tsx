import { AnimatePresence } from "framer-motion";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import PodcastLibrary from "@/components/podcasts/PodcastLibrary";
import AppSidebar from "@/components/layout/AppSidebar";
import { PlayerProvider } from "@/context/PlayerContext";
import { PodcastProvider } from "@/context/PodcastContext";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <PodcastProvider>
      <PlayerProvider>
        <SidebarProvider>
          <div className="flex h-screen flex-col bg-background">
            <div className="flex flex-1 overflow-hidden">
              <AppSidebar />
              <SidebarInset className="flex-1 overflow-y-auto">
                <PodcastLibrary />
              </SidebarInset>
            </div>
            <AnimatePresence>
              <Player />
            </AnimatePresence>
            <BottomNavBar />
          </div>
        </SidebarProvider>
      </PlayerProvider>
    </PodcastProvider>
  );
}

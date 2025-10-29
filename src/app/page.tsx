import { PlayerProvider } from "@/context/PlayerContext";
import { PodcastProvider } from "@/context/PodcastContext";
import AppSidebar from "@/components/layout/AppSidebar";
import Player from "@/components/layout/Player";
import PodcastLibrary from "@/components/podcasts/PodcastLibrary";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <PodcastProvider>
      <PlayerProvider>
        <SidebarProvider>
          <div className="flex h-screen flex-col bg-background">
            <div className="flex flex-1 overflow-hidden">
              <AppSidebar />
              <SidebarInset className="flex-1 overflow-y-auto pb-28">
                <PodcastLibrary />
              </SidebarInset>
            </div>
            <Player />
          </div>
        </SidebarProvider>
      </PlayerProvider>
    </PodcastProvider>
  );
}

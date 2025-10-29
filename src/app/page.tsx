import { PlayerProvider } from "@/context/PlayerContext";
import { podcasts } from "@/lib/podcasts";
import AppSidebar from "@/components/layout/AppSidebar";
import Player from "@/components/layout/Player";
import PodcastLibrary from "@/components/podcasts/PodcastLibrary";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <PlayerProvider initialPodcasts={podcasts}>
      <SidebarProvider>
        <div className="flex flex-col h-screen bg-background">
          <div className="flex flex-1 overflow-hidden">
            <AppSidebar />
            <SidebarInset className="flex-1 overflow-y-auto pb-28">
              <main className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-3xl font-bold tracking-tight mb-6 font-headline">
                  Your Library
                </h1>
                <PodcastLibrary />
              </main>
            </SidebarInset>
          </div>
          <Player />
        </div>
      </SidebarProvider>
    </PlayerProvider>
  );
}

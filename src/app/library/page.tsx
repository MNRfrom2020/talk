import { AnimatePresence } from "framer-motion";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import PodcastLibrary from "@/components/podcasts/PodcastLibrary";
import AppSidebar from "@/components/layout/AppSidebar";
import { PlayerProvider } from "@/context/PlayerContext";
import { PodcastProvider } from "@/context/PodcastContext";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HistoryList from "@/components/podcasts/HistoryList";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LibraryPage() {
  return (
    <PodcastProvider>
      <PlayerProvider>
        <SidebarProvider>
          <div className="flex h-screen flex-col bg-background">
            <div className="flex flex-1 overflow-hidden">
              <AppSidebar />
              <SidebarInset className="flex flex-1 flex-col">
                <ScrollArea className="h-full">
                  <main className="p-4 sm:p-6 lg:p-8">
                    <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
                      Your Library
                    </h1>
                    <Tabs defaultValue="history" className="w-full">
                      <TabsList className="mb-4 grid w-full grid-cols-2">
                        <TabsTrigger value="history">History</TabsTrigger>
                        <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
                      </TabsList>
                      <TabsContent value="history">
                        <HistoryList />
                      </TabsContent>
                      <TabsContent value="podcasts">
                        <PodcastLibrary showTitle={false} />
                      </TabsContent>
                    </Tabs>
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
      </PlayerProvider>
    </PodcastProvider>
  );
}

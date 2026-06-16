import { AnimatePresence } from "framer-motion";
import AppSidebar from "@/components/layout/AppSidebar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import PodcastCard from "@/components/podcasts/PodcastCard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import MobileHeader from "@/components/layout/MobileHeader";
import { cn } from "@/lib/utils";
import { useParams } from "react-router-dom";
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { usePodcast } from "@/context/PodcastContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlaylist } from "@/context/PlaylistContext";
import PlaylistCard from "@/components/playlists/PlaylistCard";
import ResumePlayButton from "@/components/player/ResumePlayButton";

const PODCASTS_PER_PAGE = 20;

const CategoryPage = () => {
  const { categoryName: encodedCategoryName } = useParams();
  const categoryName = decodeURIComponent(encodedCategoryName || "");
  const { isExpanded, play } = usePlayer();
  const { fetchPodcasts } = usePodcast();
  const { playlists: allPlaylists, getPodcastsForPlaylist } = usePlaylist();

  const [sortOrder, setSortOrder] = React.useState("newest");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [podcasts, setPodcasts] = React.useState<any[]>([]);
  const [offset, setOffset] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);

  // Reset offset and fetch when category changes
  React.useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchCategoryPodcasts(0);
  }, [categoryName]);

  const fetchCategoryPodcasts = async (offsetToFetch: number) => {
    setIsLoading(true);
    try {
      const data = await fetchPodcasts({
        action: "list",
        category: categoryName,
        limit: PODCASTS_PER_PAGE,
        offset: offsetToFetch,
      });
      
      if (data.length < PODCASTS_PER_PAGE) {
        setHasMore(false);
      }
      
      setPodcasts(prev => offsetToFetch === 0 ? data : [...prev, ...data]);
    } catch (error) {
      console.error("Error fetching podcasts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      const newOffset = offset + PODCASTS_PER_PAGE;
      setOffset(newOffset);
      fetchCategoryPodcasts(newOffset);
    }
  };

  const podcastsInCategory = React.useMemo(() => {
    let result = [...podcasts];

    // Filter by search term
    if (searchTerm) {
      result = result.filter((p) =>
        p.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort logic
    switch (sortOrder) {
      case "a-z":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "z-a":
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        );
        break;
      case "newest":
      default:
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }
    return result;
  }, [podcasts, sortOrder, searchTerm]);

  const playlistsInCategory = React.useMemo(() => {
    return allPlaylists.filter((playlist) => {
      const playlistPodcasts = getPodcastsForPlaylist(
        playlist.id,
        podcasts // Use fetched podcasts instead of allPodcasts for efficiency
      );
      return playlistPodcasts.some((p) =>
        p.categories.includes(categoryName)
      );
    });
  }, [categoryName, allPlaylists, getPodcastsForPlaylist, podcasts]);

  const handlePlayAll = () => {
    if (podcastsInCategory.length > 0) {
      play(podcastsInCategory[0].id, podcastsInCategory, { expand: true });
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col bg-background">
        <MobileHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <ScrollArea className="h-full">
              <main className={cn("p-4 sm:p-6 lg:p-8", "pb-24 md:pb-8")}>
                <hr className="h-20 border-transparent md:hidden" />
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <h1 className="font-headline text-3xl font-bold tracking-tight">
                      {categoryName}
                    </h1>
                    {podcastsInCategory.length > 0 && (
                      <Button
                        onClick={handlePlayAll}
                        size="sm"
                        className="rounded-full"
                      >
                        <Play className="mr-2 h-4 w-4 fill-current" />
                        Play all
                      </Button>
                    )}
                  </div>
                </div>

                <Tabs defaultValue="audios" className="w-full">
                  <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <TabsList>
                      <TabsTrigger value="audios">Audio</TabsTrigger>
                      <TabsTrigger value="playlists">Playlist</TabsTrigger>
                    </TabsList>
                    <div className="flex w-full gap-2 md:w-auto">
                      <Input
                        placeholder="Filter in this category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-48"
                      />
                      <Select
                        value={sortOrder}
                        onValueChange={setSortOrder}
                      >
                        <SelectTrigger className="w-full md:w-32">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest</SelectItem>
                          <SelectItem value="oldest">Oldest</SelectItem>
                          <SelectItem value="a-z">A-Z</SelectItem>
                          <SelectItem value="z-a">Z-A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <TabsContent value="audios">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {podcastsInCategory.map((podcast) => (
                        <PodcastCard
                          key={podcast.id}
                          podcast={podcast}
                          playlist={podcastsInCategory}
                        />
                      ))}
                    </div>
                    
                    {hasMore && (
                      <div className="mt-8 flex justify-center">
                        <Button
                          onClick={handleLoadMore}
                          disabled={isLoading}
                          variant="outline"
                        >
                          {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Load More
                        </Button>
                      </div>
                    )}
                    
                    {!hasMore && podcastsInCategory.length > 0 && (
                      <p className="mt-8 text-center text-sm text-muted-foreground">
                        No more podcasts to load
                      </p>
                    )}
                    
                    {podcastsInCategory.length === 0 && !isLoading && (
                      <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
                        <p className="text-muted-foreground">
                          No podcasts found in this category.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="playlists">
                    {playlistsInCategory.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {playlistsInCategory.map((playlist) => (
                          <PlaylistCard key={playlist.id} playlist={playlist} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
                        <p className="text-muted-foreground">
                          No playlists found for this category.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
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
};

export default CategoryPage;
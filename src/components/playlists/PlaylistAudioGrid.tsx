import { ChevronUp, ChevronDown, Play, Heart, MoreVertical } from "lucide-react";
import type { Podcast } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/context/PlayerContext";
import { usePodcast } from "@/context/PodcastContext";
import { usePlaylist } from "@/context/PlaylistContext";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreatePlaylistDialog } from "./CreatePlaylistDialog";
import { Plus, ListPlus, Share2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlaylistAudioGridProps {
  podcasts: Podcast[];
  playlistId: string;
  onRemove?: (podcastId: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export default function PlaylistAudioGrid({
  podcasts,
  playlistId,
  onRemove,
  onReorder,
}: PlaylistAudioGridProps) {
  const { play, currentTrack, isPlaying, addToQueue } = usePlayer();
  const { podcasts: allPodcasts } = usePodcast();
  const {
    playlists,
    addPodcastToGuestPlaylist,
    addPodcastToUserPlaylist,
    toggleFavoritePodcast,
    isFavoritePodcast,
    FAVORITES_PLAYLIST_ID,
  } = usePlaylist();
  const { user } = useUser();
  const { toast } = useToast();

  const userPlaylists = playlists.filter(
    (p) => !p.isPredefined && p.id !== FAVORITES_PLAYLIST_ID,
  );

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= podcasts.length) return;

    const reordered = Array.from(podcasts);
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    onReorder(reordered.map((p) => p.id));
  };

  return (
    <div className="flex flex-col gap-2 pb-4 md:gap-3 md:pb-8">
      {podcasts.map((podcast, index) => {
        const isActive = currentTrack?.id === podcast.id;
        const isFav = isFavoritePodcast(podcast.id);
        const artistText = Array.isArray(podcast.artist)
          ? podcast.artist.join(", ")
          : podcast.artist || "Unknown Artist";

        return (
          <div
            key={podcast.id}
            className="flex items-stretch gap-3 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-secondary/50 md:gap-4 md:p-4"
          >
            {/* Left: Cover art + text */}
            <button
              type="button"
              className="flex flex-1 items-center gap-3 text-left md:gap-4"
              onClick={() => play(podcast.id, podcasts)}
              aria-label={`Play ${podcast.title}`}
            >
              <div className="relative h-14 w-14 flex-shrink-0 md:h-16 md:w-16">
                <img
                  src={podcast.coverArt}
                  alt={podcast.title}
                  className="h-full w-full rounded-md object-cover"
                />
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity",
                    isActive && isPlaying ? "opacity-100" : "group-hover:opacity-100",
                  )}
                >
                  {isActive && isPlaying ? (
                    <div className="flex items-end gap-0.5 h-5">
                      <span className="w-0.5 bg-white rounded-full animate-pulse h-2" />
                      <span className="w-0.5 bg-white rounded-full animate-pulse h-3" />
                      <span className="w-0.5 bg-white rounded-full animate-pulse h-2" />
                    </div>
                  ) : (
                    <Play className="h-5 w-5 fill-white text-white ml-0.5" />
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h3 className="font-semibold leading-tight line-clamp-2 text-foreground">
                  {podcast.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {artistText}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {podcast.categories?.slice(0, 2).map((category) => (
                    <span
                      key={category}
                      className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            {/* Right: Button column */}
            <div className="flex flex-col items-end justify-between gap-1">
              {/* Top: Move Up / Move Down */}
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveItem(index, "up");
                  }}
                  aria-label="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === podcasts.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveItem(index, "down");
                  }}
                  aria-label="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Bottom: Favorite + Menu */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavoritePodcast(podcast.id);
                    toast({
                      title: isFav ? "Removed from Favorites" : "Added to Favorites",
                    });
                  }}
                  aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isFav && "fill-primary text-primary",
                    )}
                  />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="More options"
                      className="p-1 text-muted-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent onClick={(e) => e.stopPropagation()} align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(podcast);
                        toast({
                          title: "Added to Queue",
                          description: `"${podcast.title}" has been added to your playing queue.`,
                        });
                      }}
                    >
                      <ListPlus className="mr-2 h-4 w-4" />
                      Add to Queue
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Add to Playlist</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {userPlaylists.map((p) => (
                          <DropdownMenuItem
                            key={p.id}
                            onClick={() => {
                              const addFn = user.isGuest
                                ? addPodcastToGuestPlaylist
                                : addPodcastToUserPlaylist;
                              addFn(p.id, podcast.id);
                              toast({
                                title: "Added to playlist",
                                description: `"${podcast.title}" has been added to "${p.name}".`,
                              });
                            }}
                          >
                            {p.name}
                          </DropdownMenuItem>
                        ))}
                        {userPlaylists.length > 0 && <DropdownMenuSeparator />}
                        <CreatePlaylistDialog>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            New Playlist
                          </DropdownMenuItem>
                        </CreatePlaylistDialog>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        const shareUrl = `${window.location.origin}/podcasts/${podcast.id}?embed=true`;
                        navigator.clipboard.writeText(shareUrl);
                        toast({ title: "Link Copied" });
                      }}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    {onRemove && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(podcast.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove from playlist
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

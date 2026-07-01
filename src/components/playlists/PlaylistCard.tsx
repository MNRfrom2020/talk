


import { Link } from "react-router-dom";
import {
  Heart,
  Lock,
  MoreVertical,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";

import { usePodcast } from "@/context/PodcastContext";
import { usePlaylist } from "@/context/PlaylistContext";
import type { Playlist, Podcast } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import PlaylistCover from "./PlaylistCover";
import { getDownloadedPodcastIds, saveAudio, deleteAudios } from "@/lib/idb";

type DownloadState = "idle" | "downloading" | "downloaded";

interface PlaylistCardProps {
  playlist: Playlist;
}

export default function PlaylistCard({ playlist }: PlaylistCardProps) {
  const { podcasts, fetchPodcasts } = usePodcast();
  const { getPodcastsForPlaylist, deletePlaylist, toggleFavorite, FAVORITES_PLAYLIST_ID } = usePlaylist();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDeleteDownloadOpen, setIsDeleteDownloadOpen] = useState(false);
  const { toast } = useToast();
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [playlistPodcasts, setPlaylistPodcasts] = useState<Podcast[]>([]);
  const [allPlaylistPodcasts, setAllPlaylistPodcasts] = useState<Podcast[]>([]);

  // Count should come from the playlist's own IDs first, not from the limited podcast cache.
  const audioCount =
    playlist.podcast_ids?.length ??
    playlist.audioCount ??
    getPodcastsForPlaylist(playlist.id, podcasts).length;

  // All playlists now use the same fetch target: the playlist UUID.
  // podcasts.php JOINs against both admin_playlist_items and playlist_items.
  const playlistFetchTarget = playlist.id;

  // 🎯 Load first 4 podcasts for cover display if not already loaded
  useEffect(() => {
    // Only fetch if: playlist has audios AND we don't have podcasts loaded yet
    if (audioCount > 0 && playlistPodcasts.length === 0) {
      // Check if podcasts are already in context
      const contextPodcasts = getPodcastsForPlaylist(playlist.id, podcasts);
      if (contextPodcasts.length > 0) {
        setPlaylistPodcasts(contextPodcasts);
      } else if (playlistFetchTarget) {
        // Fetch first 4 podcasts for cover display
        fetchPodcasts({
          action: "list",
          playlist_id: playlistFetchTarget,
          limit: 4,
          offset: 0
        }).then(setPlaylistPodcasts);
      }
    }
  }, [playlist.id, audioCount, playlistFetchTarget, podcasts]);

  // 🎯 Load ALL podcasts for download functionality
  useEffect(() => {
    if (audioCount > 0 && allPlaylistPodcasts.length === 0) {
      // Check if all podcasts are already in context
      const contextPodcasts = getPodcastsForPlaylist(playlist.id, podcasts);
      if (contextPodcasts.length === audioCount) {
        setAllPlaylistPodcasts(contextPodcasts);
      } else if (playlistFetchTarget) {
        // Need to fetch all podcasts (not just first 4)
        fetchPodcasts({
          action: "list",
          playlist_id: playlistFetchTarget,
          limit: audioCount,
          offset: 0
        }).then(setAllPlaylistPodcasts);
      }
    }
  }, [playlist.id, audioCount, playlistFetchTarget, podcasts, playlistPodcasts]);

  useEffect(() => {
    const checkDownloads = async () => {
      if (audioCount === 0) {
        setDownloadState("idle");
        return;
      }
      const downloadedIds = await getDownloadedPodcastIds();
      // Check if ALL podcasts in the playlist are downloaded (use allPlaylistPodcasts)
      if (allPlaylistPodcasts.length > 0 && allPlaylistPodcasts.every(p => downloadedIds.includes(p.id))) {
        setDownloadState("downloaded");
      } else if (allPlaylistPodcasts.length > 0 && allPlaylistPodcasts.some(p => downloadedIds.includes(p.id))) {
        // Some downloaded, some not
        setDownloadState("idle");
      } else {
        setDownloadState("idle");
      }
    };

    checkDownloads();
    const interval = setInterval(checkDownloads, 3000);
    return () => clearInterval(interval);
  }, [audioCount, allPlaylistPodcasts]);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAlertOpen(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deletePlaylist(playlist.id);
    toast({
      title: "Playlist Deleted",
      description: `"${playlist.name}" has been deleted.`,
    });
    setIsAlertOpen(false);
  };
  
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFavorite(playlist.id);
    toast({
      title: playlist.isFavorite ? "Removed from Saved" : "Added to Saved",
      description: `"${playlist.name}" has been ${playlist.isFavorite ? 'removed from' : 'added to'} your saved playlists.`,
    });
  };

  const handleDownloadAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allPlaylistPodcasts.length === 0) return;

    setDownloadState("downloading");
    toast({
      title: "Starting Download",
      description: `Downloading ${allPlaylistPodcasts.length} audios for "${playlist.name}".`,
    });

    // Cache playlist cover art offline as Base64 in localStorage cache
    const coverUrl = playlist.cover || playlist.coverArt || (playlist as any).cover_art;
    if (coverUrl && !coverUrl.startsWith("data:")) {
      try {
        const coverResponse = await fetch(coverUrl);
        if (coverResponse.ok) {
          const coverBlob = await coverResponse.blob();
          const base64Cover = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(coverBlob);
          });
          
          // Update the cache in localStorage
          const cached = localStorage.getItem("podcast_playlists_all_offline_cache");
          if (cached) {
            const parsed = JSON.parse(cached);
            const updated = parsed.map((p: any) => {
              if (String(p.id) === String(playlist.id)) {
                return { ...p, cover: base64Cover, coverArt: base64Cover, cover_art: base64Cover };
              }
              return p;
            });
            localStorage.setItem("podcast_playlists_all_offline_cache", JSON.stringify(updated));
          }
        }
      } catch (err) {
        console.error("Failed to cache playlist cover art offline:", err);
      }
    }

    const downloadedPodcastIds = await getDownloadedPodcastIds();
    let downloadedCount = 0;

    for (const podcast of allPlaylistPodcasts) {
      if (!downloadedPodcastIds.includes(podcast.id)) {
        try {
          const response = await fetch(podcast.audioUrl);
          if (!response.ok) throw new Error(`Failed to fetch ${podcast.title}`);
          const blob = await response.blob();
          await saveAudio(podcast, blob);
          downloadedCount++;
        } catch (error) {
          console.error(`Failed to download ${podcast.title}:`, error);
        }
      }
    }

    setDownloadState("downloaded");
    toast({
      title: "Download Complete",
      description: `${downloadedCount} new audios from "${playlist.name}" are now available offline.`,
    });
  };

  const handleDeleteDownloads = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allPlaylistPodcasts.length === 0) return;

    setDownloadState("downloading");
    toast({
      title: "Deleting Downloads",
      description: `Removing ${allPlaylistPodcasts.length} audios from "${playlist.name}".`,
    });

    try {
      const idsToDelete = allPlaylistPodcasts.map(p => p.id);
      await deleteAudios(idsToDelete);
      setDownloadState("idle");
      toast({
        title: "Downloads Deleted",
        description: `All audios from "${playlist.name}" have been removed from your device.`,
      });
    } catch (error) {
      console.error("Failed to delete downloads:", error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete downloaded audios.",
      });
      setDownloadState("downloaded");
    }
  };

  return (
    <>
      <Card className="group relative w-full overflow-hidden border-none bg-card shadow-lg transition-colors duration-300 hover:bg-secondary/80">
        {playlist.isPredefined && (
          <div className="absolute left-3 top-3 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
              onClick={handleToggleFavorite}
              aria-label={playlist.isFavorite ? "Remove from saved playlists" : "Add to saved playlists"}
            >
              <Heart
                className={cn(
                  "h-5 w-5 text-foreground",
                  playlist.isFavorite && "fill-primary text-primary"
                )}
              />
            </Button>
          </div>
        )}
        
        <div className="absolute right-2 top-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="More options"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="rounded-full p-1 text-muted-foreground opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                >
                  <MoreVertical size={20} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                align="end"
              >
                {audioCount > 0 && (
                  <>
                    {downloadState === "downloaded" ? (
                      <DropdownMenuItem
                        onClick={handleDeleteDownloads}
                        disabled={downloadState === "downloading"}
                        className="text-destructive"
                      >
                        {downloadState === "downloading" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        <span>Delete Downloads</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={handleDownloadAll}
                        disabled={downloadState === "downloading"}
                      >
                        {downloadState === "downloading" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        <span>
                          {downloadState === "downloaded" ? "Downloaded" : "Download All"}
                        </span>
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                
                {!playlist.isPredefined && playlist.id !== FAVORITES_PLAYLIST_ID && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete Playlist</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        <Link to={`/playlists/${playlist.id}`}  className="block h-full">
          <CardContent className="p-4">
            <div className="relative mb-4 aspect-square">
              <PlaylistCover playlist={playlist} podcasts={playlistPodcasts} />
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                  {downloadState === 'downloaded' && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/80 backdrop-blur-sm">
                      <Download className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                  {playlist.isPredefined && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/80 p-0 backdrop-blur-sm">
                      <Lock className="h-3 w-3" />
                      <span className="sr-only">Curated</span>
                    </div>
                  )}
               </div>
            </div>
            <h3 className="h-12 font-semibold text-foreground line-clamp-2">
              {playlist.name || 'Untitled Playlist'}
            </h3>
            <p className="h-5 text-sm text-muted-foreground line-clamp-1">
              {audioCount} {audioCount === 1 ? "audio" : "audios"}
            </p>
          </CardContent>
        </Link>
      </Card>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              playlist &quot;{playlist.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => {
                e.stopPropagation();
                setIsAlertOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

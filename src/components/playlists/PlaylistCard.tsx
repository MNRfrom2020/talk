
"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  ListMusic,
  Lock,
  MoreVertical,
  Share2,
  Trash2,
  Edit,
  Download,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";

import { usePodcast } from "@/context/PodcastContext";
import { usePlaylist } from "@/context/PlaylistContext";
import type { Playlist } from "@/lib/types";
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
import { EditPlaylistDialog } from "./EditPlaylistDialog";
import { getDownloadedPodcastIds, saveAudio } from "@/lib/idb";

type DownloadState = "idle" | "downloading" | "downloaded";

interface PlaylistCardProps {
  playlist: Playlist;
}

export default function PlaylistCard({ playlist }: PlaylistCardProps) {
  const { podcasts } = usePodcast();
  const { getPodcastsForPlaylist, deletePlaylist, toggleFavorite, FAVORITES_PLAYLIST_ID } = usePlaylist();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { toast } = useToast();
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");

  const playlistPodcasts = getPodcastsForPlaylist(playlist.id, podcasts);
  
    useEffect(() => {
    const checkDownloads = async () => {
      if (playlistPodcasts.length === 0) {
        setDownloadState("idle");
        return;
      }
      const downloadedIds = await getDownloadedPodcastIds();
      if (playlistPodcasts.every(p => downloadedIds.includes(p.id))) {
        setDownloadState("downloaded");
      } else {
        setDownloadState("idle");
      }
    };
    
    checkDownloads();
    const interval = setInterval(checkDownloads, 3000);
    return () => clearInterval(interval);
  }, [playlistPodcasts]);

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

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/playlists/${playlist.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Playlist link has been copied to your clipboard.",
    });
  };

  const handleDownloadAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlistPodcasts.length === 0) return;

    setDownloadState("downloading");
    toast({
      title: "Starting Download",
      description: `Downloading ${playlistPodcasts.length} audios for "${playlist.name}".`,
    });

    const downloadedPodcastIds = await getDownloadedPodcastIds();
    let downloadedCount = 0;
    
    for (const podcast of playlistPodcasts) {
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
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="mr-2 h-4 w-4" />
                  <span>Share</span>
                </DropdownMenuItem>

                {playlistPodcasts.length > 0 && (
                   <DropdownMenuItem
                    onClick={handleDownloadAll}
                    disabled={downloadState !== "idle"}
                  >
                    {downloadState === "downloading" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    <span>
                      {downloadState === "downloaded" ? "Downloaded" : "Download"}
                    </span>
                  </DropdownMenuItem>
                )}
                
                {!playlist.isPredefined && playlist.id !== FAVORITES_PLAYLIST_ID && (
                  <>
                    <DropdownMenuSeparator />
                     <EditPlaylistDialog playlist={playlist}>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                    </EditPlaylistDialog>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        <Link href={`/playlists/${playlist.id}`} passHref className="block h-full">
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
              {playlist.name}
            </h3>
            <p className="h-5 text-sm text-muted-foreground line-clamp-1">
              {playlistPodcasts.length} {playlistPodcasts.length === 1 ? "audio" : "audios"}
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

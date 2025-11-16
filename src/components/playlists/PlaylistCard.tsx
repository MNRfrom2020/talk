
"use client";

import Image from "next/image";
import Link from "next/link";
import { ListMusic, Lock, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";

import { usePodcast } from "@/context/PodcastContext";
import { usePlaylist, FAVORITES_PLAYLIST_ID } from "@/context/PlaylistContext";
import type { Playlist } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

interface PlaylistCardProps {
  playlist: Playlist;
}

export default function PlaylistCard({ playlist }: PlaylistCardProps) {
  const { podcasts } = usePodcast();
  const { getPodcastsForPlaylist, deletePlaylist } = usePlaylist();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { toast } = useToast();

  const playlistPodcasts = getPodcastsForPlaylist(playlist.id, podcasts);
  const coverArt =
    playlistPodcasts.length > 0
      ? playlistPodcasts[0].coverArt
      : `https://picsum.photos/seed/${playlist.id}/500/500`;
  const coverArtHint =
    playlistPodcasts.length > 0
      ? playlistPodcasts[0].coverArtHint
      : "abstract art";

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

  return (
    <>
      <Card className="group relative w-full overflow-hidden border-none bg-card shadow-lg transition-colors duration-300 hover:bg-secondary/80">
        {!playlist.isPredefined && playlist.id !== FAVORITES_PLAYLIST_ID && (
          <div className="absolute right-2 top-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="More options"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="rounded-full p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
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
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <Link href={`/playlists/${playlist.id}`} passHref className="block h-full">
          <CardContent className="p-4">
            <div className="relative mb-4 aspect-square">
              {playlistPodcasts.length > 0 ? (
                <Image
                  src={coverArt}
                  alt={playlist.name}
                  fill
                  className="rounded-md object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  data-ai-hint={coverArtHint}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-md bg-secondary">
                  <ListMusic className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              {playlist.isPredefined && (
                <Badge
                  variant="secondary"
                  className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center p-0"
                >
                  <Lock className="h-3 w-3" />
                  <span className="sr-only">Curated</span>
                </Badge>
              )}
            </div>
            <h3 className="h-6 font-semibold text-foreground line-clamp-1">
              {playlist.name}
            </h3>
            <p className="h-5 text-sm text-muted-foreground line-clamp-1">
              Playlist
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

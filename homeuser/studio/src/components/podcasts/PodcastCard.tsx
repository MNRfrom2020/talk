
"use client";

import Image from "next/image";
import {
  MoreVertical,
  Play,
  Heart,
  Plus,
  Trash2,
  ListPlus,
  Share2,
} from "lucide-react";
import type { Podcast } from "@/lib/types";
import { usePlayer } from "@/context/PlayerContext";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { usePlaylist } from "@/context/PlaylistContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import { CreatePlaylistDialog } from "../playlists/CreatePlaylistDialog";
import { type MouseEvent, useEffect, useState } from "react";
import { Progress } from "../ui/progress";
import { usePodcast } from "@/context/PodcastContext";
import { useUser } from "@/context/UserContext";

interface PodcastCardProps {
  podcast: Podcast;
  playlist?: Podcast[];
  playlistId?: string; // To identify which playlist the card is in
  onRemove?: (playlistId: string, podcastId: string) => void;
}

export default function PodcastCard({
  podcast,
  playlist,
  playlistId,
  onRemove,
}: PodcastCardProps) {
  const { user } = useUser();
  const {
    play,
    currentTrack,
    isPlaying,
    addToQueue,
    getPodcastProgress,
  } = usePlayer();
  const { podcasts: allPodcasts } = usePodcast();
  const {
    playlists,
    addPodcastToGuestPlaylist,
    addPodcastToUserPlaylist,
    toggleFavoritePodcast,
    isFavoritePodcast,
    FAVORITES_PLAYLIST_ID,
    getPlaylistById,
  } = usePlaylist();
  const { toast } = useToast();
  const isActive = currentTrack?.id === podcast.id;
  const isFavorite = isFavoritePodcast(podcast.id);
  const currentPlaylist = playlistId ? getPlaylistById(playlistId) : null;
  
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const savedProgress = getPodcastProgress(podcast.id);
    if (savedProgress) {
      setProgress(savedProgress.progress);
      setDuration(savedProgress.duration);
    } else {
      setProgress(0);
      setDuration(0);
    }
  }, [podcast.id, getPodcastProgress, currentTrack]);


  const userPlaylists = playlists.filter(
    (p) => !p.isPredefined && p.id !== FAVORITES_PLAYLIST_ID,
  );

  const handleToggleFavorite = (e: MouseEvent) => {
    e.stopPropagation();
    toggleFavoritePodcast(podcast.id);
    toast({
      title: isFavorite ? "Removed from Favorites" : "Added to Favorites",
      description: `"${podcast.title}" has been ${
        isFavorite ? "removed from" : "added to"
      } your Favorites.`,
    });
  };

  const handleRemoveFromPlaylist = (e: MouseEvent) => {
    e.stopPropagation();
    if (onRemove && playlistId) {
      onRemove(playlistId, podcast.id);
      toast({
        title: "Podcast Removed",
        description: `"${podcast.title}" has been removed from the playlist.`,
      });
    }
  };

  const handleAddToQueue = (e: MouseEvent) => {
    e.stopPropagation();
    addToQueue(podcast);
    toast({
      title: "Added to Queue",
      description: `"${podcast.title}" has been added to your playing queue.`,
    });
  };
  
  const handleShare = (e: MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/podcasts/${podcast.id}?embed=true`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied",
      description: "A shareable link has been copied to your clipboard.",
    });
  };

  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;
  const showProgressBar = progress > 1 && progress < duration - 1;

  const artistText = Array.isArray(podcast.artist)
    ? podcast.artist.join(", ")
    : podcast.artist || "Unknown Artist";

  return (
    <Card className="group relative w-full overflow-hidden border-none bg-card shadow-lg transition-colors duration-300 hover:bg-secondary/80">
      <div className="absolute left-3 top-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
          onClick={handleToggleFavorite}
          aria-label={
            isFavorite ? "Remove from favorites" : "Add to favorites"
          }
        >
          <Heart
            className={cn(
              "h-5 w-5 text-foreground",
              isFavorite && "fill-primary text-primary",
            )}
          />
        </Button>
      </div>

      <div className="absolute right-3 top-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="More options"
              className="p-1 text-muted-foreground opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical size={20} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            onClick={(e) => e.stopPropagation()}
            align="end"
          >
            <DropdownMenuItem onClick={handleAddToQueue}>
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
                      const addFunction = user.isGuest
                        ? addPodcastToGuestPlaylist
                        : addPodcastToUserPlaylist;
                      addFunction(p.id, podcast.id);
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

            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuItem>

            {onRemove && currentPlaylist && !currentPlaylist.isPredefined && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleRemoveFromPlaylist}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove from this playlist
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        type="button"
        className="w-full text-left"
        onClick={() => play(podcast.id, playlist ?? allPodcasts)}
        aria-label={`Play ${podcast.title}`}
      >
        <CardContent className="p-4">
          <div className="relative mb-4 aspect-square">
            <Image
              src={podcast.coverArt}
              alt={podcast.title}
              fill
              className="rounded-md object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              data-ai-hint={podcast.coverArtHint}
            />
            {showProgressBar && (
              <Progress
                value={progressPercentage}
                className="absolute bottom-0 h-1 w-full rounded-none rounded-b-md"
              />
            )}
          </div>
          <h3 className="h-12 font-semibold text-foreground line-clamp-2">
            {podcast.title}
          </h3>
          <p className="h-5 text-sm text-muted-foreground line-clamp-1">
            {artistText}
          </p>
          <div className="mt-2 flex h-6 flex-wrap gap-1 overflow-hidden">
            {podcast.categories.slice(0, 2).map((category) => (
              <Badge key={category} variant="secondary">
                {category}
              </Badge>
            ))}
          </div>
        </CardContent>
      </button>
      <div className="absolute bottom-24 right-6">
        <button
          type="button"
          onClick={() => play(podcast.id, playlist ?? allPodcasts)}
          aria-label={`Play ${podcast.title}`}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xl transform transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-90",
            { "opacity-100 scale-100": isActive && isPlaying },
          )}
        >
          <Play className="ml-1 h-6 w-6 fill-current" />
        </button>
      </div>
    </Card>
  );
}

    
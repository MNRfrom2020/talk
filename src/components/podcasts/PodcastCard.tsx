
"use client";

import Image from "next/image";
import { MoreVertical, Play, Heart } from "lucide-react";
import type { Podcast } from "@/lib/types";
import { usePlayer } from "@/context/PlayerContext";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { usePlaylist } from "@/context/PlaylistContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";

interface PodcastCardProps {
  podcast: Podcast;
  playlist?: Podcast[];
}

export default function PodcastCard({ podcast, playlist }: PodcastCardProps) {
  const { play, currentTrack, isPlaying } = usePlayer();
  const { playlists, addPodcastToPlaylist, toggleFavoritePodcast, isFavoritePodcast, FAVORITES_PLAYLIST_ID } = usePlaylist();
  const { toast } = useToast();
  const isActive = currentTrack?.id === podcast.id;
  const isFavorite = isFavoritePodcast(podcast.id);

  const userPlaylists = playlists.filter(p => !p.isPredefined && p.id !== FAVORITES_PLAYLIST_ID);

  const handleAddToPlaylist = (playlistId: string) => {
    addPodcastToPlaylist(playlistId, podcast.id);
    const playlist = playlists.find(p => p.id === playlistId);
    toast({
      title: "Added to playlist",
      description: `"${podcast.title}" has been added to "${playlist?.name}".`,
    });
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoritePodcast(podcast.id);
     toast({
      title: isFavorite ? "Removed from Favorites" : "Added to Favorites",
      description: `"${podcast.title}" has been ${isFavorite ? 'removed from' : 'added to'} your Favorites.`,
    });
  }

  return (
    <Card className="group relative w-full overflow-hidden border-none bg-card shadow-lg transition-colors duration-300 hover:bg-secondary/80">
       <div className="absolute left-2 top-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={handleToggleFavorite}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={cn(
              "h-5 w-5 text-foreground",
              isFavorite && "fill-primary text-primary"
            )}
          />
        </Button>
      </div>
      <div className="absolute right-2 top-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="More options"
              className="p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical size={20} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            onClick={(e) => e.stopPropagation()}
            align="end"
          >
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Add to Playlist</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {userPlaylists.length > 0 ? (
                  userPlaylists.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => handleAddToPlaylist(p.id)}
                    >
                      {p.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No playlists created</DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        type="button"
        className="w-full text-left"
        onClick={() => play(podcast.id, playlist)}
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
          </div>
          <h3 className="h-12 font-semibold text-foreground line-clamp-2">
            {podcast.title}
          </h3>
          <p className="h-5 text-sm text-muted-foreground line-clamp-1">
            {podcast.artist}
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
          onClick={() => play(podcast.id, playlist)}
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

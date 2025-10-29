"use client";

import Image from "next/image";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function Player() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    progress,
    duration,
    seek,
    volume,
    setVolume,
  } = usePlayer();

  const handleProgressChange = (value: number[]) => {
    seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  if (!currentTrack) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-card/80 backdrop-blur-sm border-t border-border/50 flex items-center justify-center px-6">
        <p className="text-muted-foreground">No podcast selected.</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-card/80 backdrop-blur-sm border-t border-border/50">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        <div className="flex items-center gap-4 w-1/3 sm:w-1/4">
          <Image
            src={currentTrack.coverArt}
            alt={currentTrack.title}
            width={64}
            height={64}
            className="rounded-md object-cover h-12 w-12 sm:h-16 sm:w-16"
            data-ai-hint={currentTrack.coverArtHint}
          />
          <div className="hidden sm:block">
            <h3 className="font-semibold text-sm truncate">
              {currentTrack.title}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 w-2/3 sm:w-1/2 max-w-2xl">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevTrack}
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <SkipBack className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="bg-primary hover:bg-primary/90 rounded-full h-10 w-10 sm:h-12 sm:w-12"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 sm:h-6 sm:w-6 fill-primary-foreground" />
              ) : (
                <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-primary-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextTrack}
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(progress)}
            </span>
            <Slider
              value={[progress]}
              max={duration}
              step={1}
              onValueChange={handleProgressChange}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 w-1/4 justify-end">
          {volume > 0 ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5" />
          )}
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
}

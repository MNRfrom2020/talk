"use client";

import Image from "next/image";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

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
      <div className="fixed bottom-0 left-0 right-0 z-50 flex h-24 items-center justify-center border-t border-border/50 bg-card/80 px-6 backdrop-blur-sm">
        <p className="text-muted-foreground">No podcast selected.</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-24 border-t border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        <div className="flex w-1/3 items-center gap-4 sm:w-1/4">
          <Image
            src={currentTrack.coverArt}
            alt={currentTrack.title}
            width={64}
            height={64}
            className="h-12 w-12 rounded-md object-cover sm:h-16 sm:w-16"
          />
          <div className="hidden sm:block">
            <h3 className="truncate text-sm font-semibold">
              {currentTrack.title}
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        <div className="flex w-2/3 max-w-2xl flex-col items-center justify-center gap-2 sm:w-1/2">
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
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 sm:h-12 sm:w-12"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-primary-foreground sm:h-6 sm:w-6" />
              ) : (
                <Play className="h-5 w-5 fill-primary-foreground sm:h-6 sm:w-6" />
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

          <div className="flex w-full items-center gap-2">
            <span className="w-10 text-right text-xs text-muted-foreground">
              {formatTime(progress)}
            </span>
            <Slider
              value={[progress]}
              max={duration}
              step={1}
              onValueChange={handleProgressChange}
              className="w-full"
            />
            <span className="w-10 text-xs text-muted-foreground">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="hidden w-1/4 items-center justify-end gap-2 sm:flex">
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

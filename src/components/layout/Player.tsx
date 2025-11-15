
"use client";

import Image from "next/image";
import {
  ChevronDown,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import Overlay from "@/components/layout/Overlay";

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
  const [isExpanded, setIsExpanded] = useState(false);

  const handleProgressChange = (value: number[]) => {
    seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const collapsedVariants = {
    hidden: { y: "100%", opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const expandedVariants = {
    hidden: { y: "100%", opacity: 0, scale: 0.95 },
    visible: { y: 0, opacity: 1, scale: 1 },
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <>
      <Overlay isVisible={isExpanded} onClick={() => setIsExpanded(false)} />
      <motion.div
        className={cn(
          "fixed left-0 right-0 z-50 border-t border-border/50 bg-card/80 backdrop-blur-sm",
          isExpanded
            ? "bottom-0 top-0 h-screen pb-16 md:pb-0"
            : "bottom-16 h-24 md:bottom-0",
        )}
        onClick={(e) => {
          if (!isExpanded) {
            e.stopPropagation();
            setIsExpanded(true);
          }
        }}
        variants={isExpanded ? expandedVariants : collapsedVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, ease: "easeInOut" }}
        layout
      >
        <div className="flex h-full flex-col">
          {isExpanded && (
            <div className="flex-shrink-0 p-4 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="h-8 w-8"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
            </div>
          )}

          <div
            className={cn("flex items-center", {
              "h-full justify-between px-4 sm:px-6": !isExpanded,
              "flex-1 flex-col justify-center gap-8 px-8": isExpanded,
            })}
          >
            <div
              className={cn("flex items-center gap-4", {
                "w-1/3 sm:w-1/4": !isExpanded,
                "w-full flex-col": isExpanded,
              })}
            >
              <motion.div
                layoutId="player-image"
                className={cn(
                  "relative shrink-0",
                  isExpanded
                    ? "w-full aspect-square max-w-sm"
                    : "h-12 w-12 sm:h-16 sm:w-16",
                )}
              >
                <Image
                  src={currentTrack.coverArt}
                  alt={currentTrack.title}
                  fill
                  className="rounded-md object-cover"
                />
              </motion.div>
              <div
                className={cn("w-full overflow-hidden", {
                  "hidden sm:block": !isExpanded,
                  "text-center": isExpanded,
                })}
              >
                <h3
                  className={cn("truncate font-semibold", {
                    "text-sm": !isExpanded,
                    "text-2xl font-bold": isExpanded,
                  })}
                >
                  {currentTrack.title}
                </h3>
                <p
                  className={cn("truncate text-muted-foreground", {
                    "text-xs": !isExpanded,
                    "text-base": isExpanded,
                  })}
                >
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            <div
              className={cn("flex flex-col items-center justify-center", {
                "w-2/3 max-w-md gap-2 sm:w-1/2": !isExpanded,
                "w-full max-w-sm gap-4": isExpanded,
              })}
            >
              <div
                className={cn("flex w-full items-center", {
                  "gap-2": !isExpanded,
                  "gap-4": isExpanded,
                })}
              >
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
              <div
                className={cn("flex w-full items-center justify-center", {
                  "gap-2 sm:gap-4": !isExpanded,
                  "gap-6": isExpanded,
                })}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevTrack();
                  }}
                  className={cn(
                    isExpanded ? "h-12 w-12" : "h-8 w-8 sm:h-10 sm:w-10",
                  )}
                >
                  <SkipBack
                    className={cn(isExpanded ? "h-6 w-6" : "h-4 w-4 sm:h-5 sm:w-5")}
                  />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className={cn(
                    "rounded-full bg-primary hover:bg-primary/90",
                    isExpanded ? "h-16 w-16" : "h-10 w-10 sm:h-12 sm:w-12",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                >
                  {isPlaying ? (
                    <Pause
                      className={cn(
                        "fill-primary-foreground",
                        isExpanded ? "h-8 w-8" : "h-5 w-5 sm:h-6 sm:w-6",
                      )}
                    />
                  ) : (
                    <Play
                      className={cn(
                        "fill-primary-foreground",
                        isExpanded ? "h-8 w-8" : "h-5 w-5 sm:h-6 sm:w-6",
                      )}
                    />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextTrack();
                  }}
                  className={cn(
                    isExpanded ? "h-12 w-12" : "h-8 w-8 sm:h-10 sm:w-10",
                  )}
                >
                  <SkipForward
                    className={cn(isExpanded ? "h-6 w-6" : "h-4 w-4 sm:h-5 sm:w-5")}
                  />
                </Button>
              </div>
            </div>

            <div
              className={cn("w-1/4 items-center justify-end gap-2", {
                "hidden sm:flex": !isExpanded,
                "flex w-full max-w-sm": isExpanded,
              })}
            >
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
                className="w-full flex-1"
              />
            </div>
          </div>

          {isExpanded && (
            <div className="absolute right-4 top-4 hidden md:block">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                <ChevronDown />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

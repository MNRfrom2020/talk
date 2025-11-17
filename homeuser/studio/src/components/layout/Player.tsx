
"use client";

import Image from "next/image";
import {
  ChevronDown,
  Moon,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
} from "lucide-react";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";

import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import Overlay from "@/components/layout/Overlay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { QueueSheet } from "@/components/player/QueueSheet";

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

const playbackRates = [1, 1.25, 1.5, 1.75, 2];
const sleepTimerOptions = [15, 30, 45, 60];

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
    playbackRate,
    setPlaybackRate,
    sleepTimer,
    setSleepTimer,
    seekForward,
    seekBackward,
  } = usePlayer();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleProgressChange = (value: number[]) => {
    seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const handleButtonClick =
    (action: () => void) => (e: React.MouseEvent) => {
      e.stopPropagation();
      action();
      const target = e.currentTarget;
      target.classList.add("animate-squish");
      setTimeout(() => {
        target.classList.remove("animate-squish");
      }, 300);
    };

  const collapsedVariants = {
    hidden: { y: "100%", opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const expandedVariants = {
    hidden: { y: "100%", opacity: 0, scale: 0.95 },
    visible: { y: 0, opacity: 1, scale: 1 },
  };

  const sleepTimerDisplay = useMemo(() => {
    if (sleepTimer.isActive && sleepTimer.timeLeft !== null) {
      return formatTime(sleepTimer.timeLeft);
    }
    return null;
  }, [sleepTimer]);

  if (!currentTrack) {
    return null;
  }
  
  const VolumeControl = (
    <div className="flex w-full flex-1 items-center gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVolume(volume > 0 ? 0 : 0.5)}>
        {volume > 0 ? (
          <Volume2 className="h-5 w-5" />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </Button>
      <Slider
        value={[volume]}
        max={1}
        step={0.01}
        onValueChange={handleVolumeChange}
        className="w-full flex-1"
      />
    </div>
  )

  return (
    <>
      <style jsx global>{`
        @keyframes squish {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-squish {
          animation: squish 0.3s ease-in-out;
        }
      `}</style>
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
                  {Array.isArray(currentTrack.artist) ? currentTrack.artist.join(", ") : currentTrack.artist}
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
                className={cn(
                  "flex w-full items-center justify-center",
                  { "gap-1 sm:gap-2": !isExpanded, "gap-2": isExpanded },
                )}
              >
                 <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleButtonClick(prevTrack)}
                  className={cn(
                    isExpanded ? "h-12 w-12" : "h-8 w-8 sm:h-10 sm:w-10",
                  )}
                >
                  <SkipBack
                    className={cn(
                      isExpanded ? "h-6 w-6" : "h-4 w-4 sm:h-5 sm:w-5",
                    )}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleButtonClick(seekBackward)}
                  className={cn(
                    isExpanded ? "h-12 w-12" : "h-8 w-8 sm:h-10 sm:w-10",
                  )}
                >
                  <RotateCcw
                    className={cn(
                      isExpanded ? "h-6 w-6" : "h-4 w-4 sm:h-5 sm:w-5",
                    )}
                  />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className={cn(
                    "rounded-full bg-primary hover:bg-primary/90",
                    isExpanded ? "h-16 w-16" : "h-10 w-10 sm:h-12 sm:w-12",
                  )}
                  onClick={handleButtonClick(togglePlay)}
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
                  onClick={handleButtonClick(seekForward)}
                  className={cn(
                    isExpanded ? "h-12 w-12" : "h-8 w-8 sm:h-10 sm:w-10",
                  )}
                >
                  <RotateCw
                    className={cn(
                      isExpanded ? "h-6 w-6" : "h-4 w-4 sm:h-5 sm:w-5",
                    )}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleButtonClick(nextTrack)}
                  className={cn(
                    isExpanded ? "h-12 w-12" : "h-8 w-8 sm:h-10 sm:w-10",
                  )}
                >
                  <SkipForward
                    className={cn(
                      isExpanded ? "h-6 w-6" : "h-4 w-4 sm:h-5 sm:w-5",
                    )}
                  />
                </Button>
              </div>
            </div>

            <div
              className={cn("flex w-full items-center gap-4", {
                "hidden sm:flex sm:w-1/4 sm:justify-end": !isExpanded,
                "max-w-sm justify-center": isExpanded,
              })}
            >
              {isExpanded && (
                <div className="flex w-full items-center justify-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-24"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {playbackRate}x
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                      {playbackRates.map((rate) => (
                        <DropdownMenuItem
                          key={rate}
                          onSelect={() => setPlaybackRate(rate)}
                        >
                          {rate}x
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-24"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Moon className="mr-2" />{" "}
                        {sleepTimerDisplay || "Timer"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onSelect={() => setSleepTimer(null)}>
                        Off
                      </DropdownMenuItem>
                      {sleepTimerOptions.map((minutes) => (
                        <DropdownMenuItem
                          key={minutes}
                          onSelect={() => setSleepTimer(minutes)}
                        >
                          {minutes} minutes
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <div className="sm:hidden">
                    <Popover>
                        <PopoverTrigger asChild>
                           <Button variant="outline" size="icon" onClick={(e) => e.stopPropagation()}>
                             {volume > 0 ? <Volume2 /> : <VolumeX />}
                           </Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" onClick={(e) => e.stopPropagation()} className="w-48 p-2">
                           {VolumeControl}
                        </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              <div className="hidden sm:flex w-full flex-1 items-center gap-2">
                 {VolumeControl}
              </div>
              
              {isExpanded && (
                <QueueSheet>
                  <Button variant="outline" className="w-full">
                    <ListMusic className="mr-2" />
                    Playlist
                  </Button>
                </QueueSheet>
              )}
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

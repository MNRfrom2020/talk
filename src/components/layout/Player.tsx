
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
  X,
  Repeat,
  Repeat1,
  Shuffle,
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
import { useIsMobile } from "@/hooks/use-mobile";

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

const playbackRates = [1, 1.25, 1.5, 1.75, 2];
const sleepTimerOptions = [15, 30, 45, 60];


const PlayerControls = ({ isExpanded = false }: { isExpanded?: boolean }) => {
  const { 
    togglePlay, 
    nextTrack, 
    prevTrack, 
    seekForward, 
    seekBackward,
    isPlaying 
  } = usePlayer();

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

  return (
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
  );
}


const ExpandedPlayerMobile = () => {
    const { 
    currentTrack, 
    progress, 
    duration, 
    handleProgressChange,
    playbackRate,
    setPlaybackRate,
    sleepTimer,
    setSleepTimer,
    toggleRepeatMode,
    repeatMode,
    toggleShuffle,
    isShuffled,
  } = usePlayer();
  
  const sleepTimerDisplay = useMemo(() => {
    if (sleepTimer.isActive && sleepTimer.timeLeft !== null) {
      return formatTime(sleepTimer.timeLeft);
    }
    return null;
  }, [sleepTimer]);

  const RepeatButtonIcon = useMemo(() => {
    if (repeatMode === 'one') return Repeat1;
    return Repeat;
  }, [repeatMode]);

  if (!currentTrack) return null;

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 px-8">
      <motion.div layoutId="player-image" className="relative mx-auto aspect-square w-full max-w-sm">
        <Image
          src={currentTrack.coverArt}
          alt={currentTrack.title}
          fill
          className="rounded-md object-cover"
        />
      </motion.div>
      <div className="w-full overflow-hidden text-center">
        <h3 className="text-2xl font-bold line-clamp-none">{currentTrack.title}</h3>
        <p className="truncate text-base text-muted-foreground">{Array.isArray(currentTrack.artist) ? currentTrack.artist.join(", ") : currentTrack.artist}</p>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center gap-4">
        <div className="flex w-full items-center gap-4">
          <span className="w-10 text-right text-xs text-muted-foreground">{formatTime(progress)}</span>
          <Slider value={[progress]} max={duration} step={1} onValueChange={handleProgressChange} className="w-full" />
          <span className="w-10 text-xs text-muted-foreground">{formatTime(duration)}</span>
        </div>
        <PlayerControls isExpanded={true} />
      </div>
      
      <div className="mx-auto w-full max-w-sm space-y-4">
        <div className="flex w-full items-center justify-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 flex-grow" onClick={(e) => e.stopPropagation()}>
                  {playbackRate}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                {playbackRates.map((rate) => (
                  <DropdownMenuItem key={rate} onSelect={() => setPlaybackRate(rate)}>
                    {rate}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 flex-grow" onClick={(e) => e.stopPropagation()}>
                  <Moon className="mr-2 h-4 w-4" /> {sleepTimerDisplay || "Timer"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onSelect={() => setSleepTimer(null)}>Off</DropdownMenuItem>
                {sleepTimerOptions.map((minutes) => (
                  <DropdownMenuItem key={minutes} onSelect={() => setSleepTimer(minutes)}>
                    {minutes} minutes
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => { e.stopPropagation(); toggleRepeatMode(); }}
              className={cn("h-10 w-10", repeatMode !== 'off' && "text-primary bg-primary/10")}
            >
              <RepeatButtonIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => { e.stopPropagation(); toggleShuffle(); }}
              className={cn("h-10 w-10", isShuffled && "text-primary bg-primary/10")}
            >
              <Shuffle className="h-5 w-5" />
            </Button>
            <QueueSheet>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <ListMusic className="h-5 w-5" />
              </Button>
            </QueueSheet>
        </div>
      </div>
    </div>
  );
};

const ExpandedPlayerDesktop = () => {
    const { 
    currentTrack, 
    progress, 
    duration, 
    handleProgressChange,
    playbackRate,
    setPlaybackRate,
    sleepTimer,
    setSleepTimer,
    toggleRepeatMode,
    repeatMode,
    volume,
    setVolume,
    toggleShuffle,
    isShuffled,
  } = usePlayer();

  const sleepTimerDisplay = useMemo(() => {
    if (sleepTimer.isActive && sleepTimer.timeLeft !== null) {
      return formatTime(sleepTimer.timeLeft);
    }
    return null;
  }, [sleepTimer]);

  const RepeatButtonIcon = useMemo(() => {
    if (repeatMode === 'one') return Repeat1;
    return Repeat;
  }, [repeatMode]);

  const VolumeControl = (
    <div className="flex w-full items-center gap-2">
      <Button variant="ghost" size="icon" className="h-10 w-8" onClick={() => setVolume(volume > 0 ? 0 : 0.5)}>
        {volume > 0 ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
      </Button>
      <Slider value={[volume]} max={1} step={0.01} onValueChange={(v) => setVolume(v[0])} className="w-full flex-1" />
    </div>
  );

  if (!currentTrack) return null;

  return (
    <div className="flex h-full w-full items-center justify-center gap-16 p-8">
       <motion.div layoutId="player-image" className="relative aspect-square w-full max-w-sm">
        <Image
          src={currentTrack.coverArt}
          alt={currentTrack.title}
          fill
          className="rounded-md object-cover"
        />
      </motion.div>

      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="w-full overflow-hidden text-center">
          <h3 className="text-2xl font-bold line-clamp-none">{currentTrack.title}</h3>
          <p className="truncate text-base text-muted-foreground">{Array.isArray(currentTrack.artist) ? currentTrack.artist.join(", ") : currentTrack.artist}</p>
        </div>
        
        <div className="flex w-full flex-col items-center justify-center gap-2">
           <div className="flex w-full items-center gap-4">
            <span className="w-10 text-right text-xs text-muted-foreground">{formatTime(progress)}</span>
            <Slider value={[progress]} max={duration} step={1} onValueChange={handleProgressChange} className="w-full" />
            <span className="w-10 text-xs text-muted-foreground">{formatTime(duration)}</span>
          </div>
          <PlayerControls isExpanded={true} />
        </div>

        <div className="flex w-full items-center justify-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 w-10" onClick={(e) => e.stopPropagation()}>
                  {playbackRate}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                {playbackRates.map((rate) => (
                  <DropdownMenuItem key={rate} onSelect={() => setPlaybackRate(rate)}>
                    {rate}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 w-24" onClick={(e) => e.stopPropagation()}>
                  <Moon className="mr-2 h-4 w-4" /> {sleepTimerDisplay || "Timer"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onSelect={() => setSleepTimer(null)}>Off</DropdownMenuItem>
                {sleepTimerOptions.map((minutes) => (
                  <DropdownMenuItem key={minutes} onSelect={() => setSleepTimer(minutes)}>
                    {minutes} minutes
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => { e.stopPropagation(); toggleRepeatMode(); }}
              className={cn("h-10 w-10", repeatMode !== 'off' && "text-primary bg-primary/10")}
            >
              <RepeatButtonIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => { e.stopPropagation(); toggleShuffle(); }}
              className={cn("h-10 w-10", isShuffled && "text-primary bg-primary/10")}
            >
              <Shuffle className="h-5 w-5" />
            </Button>
            <QueueSheet>
               <Button variant="outline" className="h-10 w-auto px-4">
                <ListMusic className="mr-2 h-5 w-5" />
                Playlist
              </Button>
            </QueueSheet>
        </div>
        {VolumeControl}
      </div>
    </div>
  );
};


export default function Player() {
  const {
    currentTrack,
    progress,
    duration,
    volume,
    setVolume,
    closePlayer,
    handleProgressChange,
    toggleRepeatMode,
    repeatMode,
    toggleShuffle,
    isShuffled,
  } = usePlayer();
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();


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

  const RepeatButtonIcon = useMemo(() => {
    if (repeatMode === 'one') return Repeat1;
    return Repeat;
  }, [repeatMode]);

  if (!currentTrack) {
    return null;
  }
  
  const VolumeControl = (
    <div className="flex w-full items-center gap-2">
      <Button variant="ghost" size="icon" className="h-10 w-8" onClick={(e) => {e.stopPropagation(); setVolume(volume > 0 ? 0 : 0.5)}}>
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
        onClick={(e) => e.stopPropagation()}
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
          "md:scale-90 md:origin-bottom",
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
            <div className={cn("absolute right-0 top-0 z-10 p-4")}>
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

          {isExpanded ? (
            isMobile ? <ExpandedPlayerMobile /> : <ExpandedPlayerDesktop />
          ) : (
             <div className="flex h-full items-center justify-between px-4 sm:px-6">
                <div className="flex w-1/3 items-center gap-4 sm:w-1/4">
                  <div className="relative flex items-center">
                    <motion.div
                      layoutId="player-image"
                      className="group relative h-12 w-12 shrink-0 sm:h-16 sm:w-16"
                    >
                      <Image
                        src={currentTrack.coverArt}
                        alt={currentTrack.title}
                        fill
                        className="rounded-md object-cover"
                      />
                       <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -left-2 -top-2 z-10 h-6 w-6 rounded-full bg-card/80 p-1 text-muted-foreground backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          closePlayer();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                  <div className="hidden w-full overflow-hidden sm:block">
                    <h3 className="truncate text-sm font-semibold">
                      {currentTrack.title}
                    </h3>
                    <p className="truncate text-xs text-muted-foreground">
                      {Array.isArray(currentTrack.artist) ? currentTrack.artist.join(", ") : currentTrack.artist}
                    </p>
                  </div>
                </div>

                <div className="flex w-2/3 max-w-md flex-col items-center justify-center gap-2 sm:w-1/2">
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
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="w-10 text-xs text-muted-foreground">
                      {formatTime(duration)}
                    </span>
                  </div>
                  <PlayerControls isExpanded={false} />
                </div>

                <div className="flex w-1/4 items-center justify-end gap-2">
                  <div className="hidden flex-col items-end gap-2 sm:flex">
                    <div className="w-full flex-1">
                      {VolumeControl}
                    </div>
                    <div className="flex items-center gap-2">
                       <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); toggleRepeatMode(); }}
                        className={cn("h-8 w-8", repeatMode !== 'off' && "text-primary bg-primary/10")}
                      >
                        <RepeatButtonIcon className="h-4 w-4" />
                      </Button>
                       <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); toggleShuffle(); }}
                        className={cn("h-8 w-8", isShuffled && "text-primary bg-primary/10")}
                      >
                        <Shuffle className="h-4 w-4" />
                      </Button>
                      <QueueSheet>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                          <ListMusic className="h-4 w-4" />
                        </Button>
                      </QueueSheet>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-0 sm:hidden">
                      <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              {volume > 0 ? <Volume2 className="h-5 w-5"/> : <VolumeX className="h-5 w-5"/>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent side="top" onClick={(e) => e.stopPropagation()} className="w-48 p-2 mb-2">
                            {VolumeControl}
                          </PopoverContent>
                      </Popover>
                      <QueueSheet>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <ListMusic className="h-5 w-5" />
                          </Button>
                      </QueueSheet>
                  </div>
                </div>
              </div>
          )}

        </div>
      </motion.div>
    </>
  );
}

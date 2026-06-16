


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
  Download,
  Trash2,
  Loader2,
  Timer,
} from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { QueueSheet } from "@/components/player/QueueSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { saveAudio, getDownloadedPodcastIds, deleteAudio } from "@/lib/idb";
import type { Podcast } from "@/lib/types";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

const playbackRates = [1, 1.25, 1.5, 1.75, 2];
const sleepTimerOptions = [15, 30, 45, 60];

const ArtistLinks = ({ artists, onLinkClick }: { artists: string[], onLinkClick: () => void }) => {
  return (
    <div className="truncate text-base text-muted-foreground">
      {artists.map((artist, index) => (
        <React.Fragment key={artist}>
          <Link to={`/artists/${encodeURIComponent(artist)}`}
            className="hover:underline"
            onClick={(e) => {
                e.stopPropagation();
                onLinkClick();
            }}
          >
            {artist}
          </Link>
          {index < artists.length - 1 && ", "}
        </React.Fragment>
      ))}
    </div>
  );
};

const SleepTimerDropdown = ({ isMobile = false }: { isMobile?: boolean }) => {
  const { sleepTimer, setSleepTimer } = usePlayer();
  const [customMinutes, setCustomMinutes] = useState("");
  const [open, setOpen] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

  const sleepTimerDisplay = useMemo(() => {
    if (sleepTimer.isActive && sleepTimer.timeLeft !== null) {
      return formatTime(sleepTimer.timeLeft);
    }
    if (sleepTimer.stopWhenCurrentTrackEnds) {
      return "Track End";
    }
    if (sleepTimer.stopWhenPlaylistEnds) {
      return "Playlist End";
    }
    return null;
  }, [sleepTimer]);

  const handleCustomTimeSubmit = () => {
    const minutes = parseInt(customMinutes);
    if (!isNaN(minutes) && minutes > 0) {
      setSleepTimer(minutes);
      setCustomMinutes("");
      setCustomDialogOpen(false);
      setOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          {isMobile ? (
            <Button variant="outline" className="h-10 w-10" onClick={(e) => e.stopPropagation()}>
              {sleepTimerDisplay ? (
                <span className="text-xs">{sleepTimerDisplay}</span>
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          ) : (
            <Button variant="outline" className="h-10 w-20" onClick={(e) => e.stopPropagation()}>
              <Moon className="mr-2 h-4 w-4" /> {sleepTimerDisplay || "Timer"}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setSleepTimer(null)}>Off</DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onSelect={() => setSleepTimer(15)}>
            15 minutes
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSleepTimer(30)}>
            30 minutes
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSleepTimer(45)}>
            45 minutes
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSleepTimer(60)}>
            60 minutes
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Timer className="mr-2 h-4 w-4" />
                Custom Time...
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Custom Sleep Timer</DialogTitle>
                <DialogDescription>
                  Enter the number of minutes after which playback should stop.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter minutes"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomTimeSubmit();
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCustomTimeSubmit}>
                  Set Timer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onSelect={() => {
              setSleepTimer(null, { stopWhenCurrentTrackEnds: true });
              setOpen(false);
            }}
            className={cn(
              sleepTimer.stopWhenCurrentTrackEnds && "bg-accent"
            )}
          >
            <Timer className="mr-2 h-4 w-4" />
            Stop After Current Track
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onSelect={() => {
              setSleepTimer(null, { stopWhenPlaylistEnds: true });
              setOpen(false);
            }}
            className={cn(
              sleepTimer.stopWhenPlaylistEnds && "bg-accent"
            )}
          >
            <ListMusic className="mr-2 h-4 w-4" />
            Stop After Playlist
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};


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

const DownloadButton = ({ podcast }: { podcast: Podcast }) => {
  const { toast } = useToast();
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "downloaded">("idle");

  useEffect(() => {
    async function checkStatus() {
      const downloadedIds = await getDownloadedPodcastIds();
      if (downloadedIds.includes(podcast.id)) {
        setDownloadState("downloaded");
      } else {
        setDownloadState("idle");
      }
    }
    checkStatus();
    // Poll for changes in case download happens elsewhere
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [podcast.id]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloadState !== "idle") return;

    setDownloadState("downloading");
    toast({
      title: "Download Started",
      description: `Downloading "${podcast.title}"...`,
    });
    try {
      const response = await fetch(podcast.audioUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      await saveAudio(podcast, blob);
      setDownloadState("downloaded");
      toast({
        title: "Download Complete",
        description: `"${podcast.title}" is now available offline.`,
      });
    } catch (error) {
      setDownloadState("idle");
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: `Could not download "${podcast.title}".`,
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloadState !== "downloaded") return;

    try {
      await deleteAudio(podcast.id);
      setDownloadState("idle");
      toast({
        title: "Download Deleted",
        description: `"${podcast.title}" has been removed from your device.`,
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Delete Failed",
        description: `Could not delete "${podcast.title}".`,
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={downloadState === 'downloaded' ? handleDelete : handleDownload}
      disabled={downloadState === 'downloading'}
      className="h-10 w-10"
    >
      {downloadState === 'downloading' && <Loader2 className="h-5 w-5 animate-spin" />}
      {downloadState === 'idle' && <Download className="h-5 w-5" />}
      {downloadState === 'downloaded' && <Trash2 className="h-5 w-5 text-destructive" />}
    </Button>
  );
};


const ExpandedPlayerMobile = () => {
    const {
    currentTrack,
    progress,
    duration,
    handleProgressChange,
    playbackRate,
    setPlaybackRate,
    toggleRepeatMode,
    repeatMode,
    volume,
    setVolume,
    setIsExpanded,
  } = usePlayer();

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
  
  const artists = Array.isArray(currentTrack.artist)
    ? currentTrack.artist
    : [currentTrack.artist || "Unknown Artist"];


  return (
    <div className="flex flex-1 flex-col justify-center gap-8 px-8">
      <motion.div layoutId="player-image" className="relative mx-auto aspect-square w-full max-w-sm">
        <img
          src={currentTrack.coverArt}
          alt={currentTrack.title}
          className="w-full h-full object-cover rounded-md object-cover"
        />
      </motion.div>
      <div className="w-full overflow-hidden text-center">
        <h3 className="text-lg font-bold line-clamp-3">{currentTrack.title}</h3>
        <ArtistLinks artists={artists} onLinkClick={() => setIsExpanded(false)} />
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

            <SleepTimerDropdown isMobile={true} />

            <Button
              variant="outline"
              size="icon"
              onClick={(e) => { e.stopPropagation(); toggleRepeatMode(); }}
              className={cn("h-10 w-10", repeatMode !== 'off' && "text-primary bg-primary/10")}
            >
              <RepeatButtonIcon className="h-5 w-5" />
            </Button>
            <DownloadButton podcast={currentTrack} />
            <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10" onClick={(e) => e.stopPropagation()}>
                    <Volume2 className="h-5 w-5"/>
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" onClick={(e) => e.stopPropagation()} className="w-48 p-2 mb-2">
                  {VolumeControl}
                </PopoverContent>
            </Popover>
            <QueueSheet>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <ListMusic className="h-5 w-5" />
              </Button>
            </QueueSheet>
        </div>
        <div className="sm:hidden">
          {VolumeControl}
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
    toggleRepeatMode,
    repeatMode,
    volume,
    setVolume,
    toggleShuffle,
    isShuffled,
    setIsExpanded,
  } = usePlayer();

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
  
  const artists = Array.isArray(currentTrack.artist)
    ? currentTrack.artist
    : [currentTrack.artist || "Unknown Artist"];


  return (
    <div className="flex h-full w-full items-center justify-center gap-16 p-8">
       <motion.div layoutId="player-image" className="relative aspect-square w-full max-w-sm">
        <img
          src={currentTrack.coverArt}
          alt={currentTrack.title}
          className="w-full h-full object-cover rounded-md object-cover"
        />
      </motion.div>

      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="w-full overflow-hidden text-center">
          <h3 className="text-2xl font-bold line-clamp-none">{currentTrack.title}</h3>
          <ArtistLinks artists={artists} onLinkClick={() => setIsExpanded(false)} />
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

            <SleepTimerDropdown />

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
            <DownloadButton podcast={currentTrack} />
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
    isExpanded,
    setIsExpanded,
  } = usePlayer();
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
  
  const artists = Array.isArray(currentTrack.artist)
    ? currentTrack.artist
    : [currentTrack.artist || "Unknown Artist"];


  return (
    <>
      
      <Overlay isVisible={isExpanded} onClick={() => setIsExpanded(false)} />
      <motion.div
        className={cn(
          "fixed left-0 right-0 z-50 border-t border-border/50 bg-card/80 backdrop-blur-sm",
          "md:scale-90 md:origin-bottom",
          isExpanded
            ? "bottom-0 top-0 h-screen"
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
                      <img
                        src={currentTrack.coverArt}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover rounded-md object-cover"
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
                     <div className="truncate text-xs text-muted-foreground">
                        {artists.map((artist, index) => (
                          <React.Fragment key={artist}>
                            <Link to={`/artists/${encodeURIComponent(artist)}`} className="hover:underline">
                              {artist}
                            </Link>
                            {index < artists.length - 1 && ', '}
                          </React.Fragment>
                        ))}
                    </div>
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

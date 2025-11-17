
"use client";

import type { Podcast } from "@/lib/types";
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { usePodcast } from "./PodcastContext";

const HISTORY_STORAGE_KEY = "podcast_history";
const PROGRESS_STORAGE_KEY = "podcast_progress";
const LISTENING_LOG_KEY = "listening_log";

// --- useThrottle Hook ---
function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
) {
  const lastCall = useRef(0);
  const timeout = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        callback(...args);
      } else {
        if (timeout.current) {
          clearTimeout(timeout.current);
        }
        timeout.current = setTimeout(() => {
          lastCall.current = now;
          callback(...args);
        }, delay);
      }
    },
    [callback, delay],
  );
}
// --- End useThrottle Hook ---

interface ProgressInfo {
  progress: number;
  duration: number;
}

interface SleepTimerInfo {
  timeLeft: number | null;
  isActive: boolean;
}

type ListeningLog = Record<string, number>; // { 'YYYY-MM-DD': seconds }

interface PlayerContextType {
  currentTrack: Podcast | null;
  isPlaying: boolean;
  play: (trackId?: string, playlist?: Podcast[]) => void;
  autoPlay: (trackId?: string, playlist?: Podcast[]) => void;
  pause: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  playRandom: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  progress: number;
  duration: number;
  seek: (time: number) => void;
  seekForward: () => void;
  seekBackward: () => void;
  volume: number;
  setVolume: (volume: number) => void;
  history: Podcast[];
  queue: Podcast[];
  setQueue: React.Dispatch<React.SetStateAction<Podcast[]>>;
  addToQueue: (track: Podcast) => void;
  playTrackFromQueue: (trackId: string) => void;
  removeFromQueue: (trackId: string) => void;
  moveTrackInQueue: (trackId: string, direction: "up" | "down") => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  getPodcastProgress: (trackId: string) => ProgressInfo | undefined;
  sleepTimer: SleepTimerInfo;
  setSleepTimer: (minutes: number | null) => void;
  listeningLog: ListeningLog;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};

export const PlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const { podcasts } = usePodcast();
  const [currentTrack, setCurrentTrack] = useState<Podcast | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Podcast[] | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [history, setHistory] = useState<Podcast[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressInfo>>(
    {},
  );
  const [queue, setQueue] = useState<Podcast[]>([]);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [sleepTimer, setSleepTimerState] = useState<SleepTimerInfo>({
    timeLeft: null,
    isActive: false,
  });
  const [listeningLog, setListeningLog] = useState<ListeningLog>({});
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastTimeUpdate = useRef(0);
  const isPlayingRef = React.useRef(isPlaying);
  const sleepTimerId = useRef<NodeJS.Timeout | null>(null);
  const sleepTimerIntervalId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load data from localStorage on initial mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
      const storedProgress = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (storedProgress) {
        setProgressMap(JSON.parse(storedProgress));
      }
      const storedLog = localStorage.getItem(LISTENING_LOG_KEY);
      if (storedLog) {
        setListeningLog(JSON.parse(storedLog));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (sleepTimerId.current) clearTimeout(sleepTimerId.current);
      if (sleepTimerIntervalId.current)
        clearInterval(sleepTimerIntervalId.current);
    };
  }, []);

  const saveListeningLog = useThrottle((log: ListeningLog) => {
    try {
      localStorage.setItem(LISTENING_LOG_KEY, JSON.stringify(log));
    } catch (error) {
      console.error("Failed to save listening log", error);
    }
  }, 5000);

  const saveProgress = useThrottle(
    (trackId: string, progress: number, duration: number) => {
      if (!trackId || isNaN(progress) || isNaN(duration)) return;
      const newProgressMap = {
        ...progressMap,
        [trackId]: { progress, duration },
      };

      // Reset progress if track is finished
      if (duration > 0 && progress >= duration - 1) {
        delete newProgressMap[trackId];
      }

      setProgressMap(newProgressMap);
      try {
        localStorage.setItem(
          PROGRESS_STORAGE_KEY,
          JSON.stringify(newProgressMap),
        );
      } catch (error) {
        console.error("Failed to save progress to localStorage", error);
      }
    },
    5000,
  );

  const getPodcastProgress = useCallback(
    (trackId: string) => {
      return progressMap[trackId];
    },
    [progressMap],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const setAudioSource = useCallback(
    async (track: Podcast, shouldAutoPlay = true) => {
      if (!audioRef.current) return;

      const sourceUrl = track.audioUrl;
      const savedProgress = getPodcastProgress(track.id);

      if (audioRef.current.src !== sourceUrl) {
        audioRef.current.src = sourceUrl;
        // When source changes, reset progress
        setProgress(0);
      }

      if (!shouldAutoPlay) {
        setIsPlaying(false);
        return;
      }

      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (
              savedProgress &&
              savedProgress.progress > 0 &&
              audioRef.current!.src === sourceUrl
            ) {
              audioRef.current!.currentTime = savedProgress.progress;
            }
            setIsPlaying(true);
            audioRef.current!.playbackRate = playbackRate;
            lastTimeUpdate.current = Date.now();
          })
          .catch((e) => {
            console.error("Playback failed", e);
            setIsPlaying(false);
          });
      }
    },
    [playbackRate, getPodcastProgress],
  );

  const addToHistory = useCallback((track: Podcast) => {
    setHistory((prevHistory) => {
      const newHistory = [
        track,
        ...prevHistory.filter((item) => item.id !== track.id),
      ].slice(0, 50);

      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
      } catch (error) {
        console.error("Failed to save history to localStorage", error);
      }
      return newHistory;
    });
  }, []);

  const playInternal = useCallback(
    (
      trackId?: string,
      playlist: Podcast[] = podcasts,
      shouldAutoPlay = true,
    ) => {
      const playlistToUse =
        playlist && playlist.length > 0 ? playlist : podcasts;

      let trackToPlay: Podcast | undefined | null = null;
      let startFromIndex = 0;

      if (trackId) {
        startFromIndex = playlistToUse.findIndex((p) => p.id === trackId);
        if (startFromIndex !== -1) {
          trackToPlay = playlistToUse[startFromIndex];
        }
      } else {
        trackToPlay =
          currentTrack || (playlistToUse.length > 0 ? playlistToUse[0] : null);
        if (trackToPlay) {
          startFromIndex = playlistToUse.findIndex(
            (p) => p.id === trackToPlay!.id,
          );
        }
      }

      if (trackToPlay) {
        const newPlaylist = playlistToUse.slice(startFromIndex);
        setCurrentPlaylist(newPlaylist);
        setQueue(newPlaylist.slice(1));

        if (currentTrack?.id !== trackToPlay.id) {
          setCurrentTrack(trackToPlay);
          addToHistory(trackToPlay);
          setAudioSource(trackToPlay, shouldAutoPlay);
        } else if (shouldAutoPlay) {
          audioRef.current
            ?.play()
            .then(() => {
              setIsPlaying(true);
              lastTimeUpdate.current = Date.now();
            })
            .catch((e) => console.error("Playback failed", e));
        }
      }
    },
    [podcasts, currentTrack, addToHistory, setAudioSource],
  );

  const play = useCallback(
    (trackId?: string, playlist?: Podcast[]) => {
      playInternal(trackId, playlist, true);
    },
    [playInternal],
  );

  const autoPlay = useCallback(
    (trackId?: string, playlist?: Podcast[]) => {
      playInternal(trackId, playlist, false);
    },
    [playInternal],
  );

  const togglePlay = useCallback(() => {
    const playlist = currentPlaylist || podcasts;
    if (!currentTrack) {
      if (!playlist || playlist.length === 0) return;
      play(playlist[0].id, playlist);
      return;
    }

    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play, currentTrack, podcasts, currentPlaylist]);

  const findCurrentTrackIndex = useCallback(() => {
    const playlist = currentPlaylist || podcasts;
    return currentTrack
      ? playlist.findIndex((p) => p.id === currentTrack.id)
      : -1;
  }, [currentTrack, podcasts, currentPlaylist]);

  const playNextInQueue = useCallback(() => {
    if (queue.length > 0) {
      const nextTrackInQueue = queue[0];
      setQueue((prev) => prev.slice(1));
      play(nextTrackInQueue.id, [nextTrackInQueue, ...queue.slice(1)]);
      return true;
    }
    return false;
  }, [queue, play]);

  const nextTrack = useCallback(() => {
    if (playNextInQueue()) return;

    // If queue is empty, do nothing
  }, [playNextInQueue]);

  const prevTrack = useCallback(() => {
    const playlist = currentPlaylist || podcasts;
    if (!playlist || playlist.length === 0) return;
    const currentIndex = findCurrentTrackIndex();

    // Find the original full playlist from which `currentPlaylist` was derived
    const originalPlaylist = podcasts;
    const originalIndex = originalPlaylist.findIndex(
      (p) => p.id === currentTrack?.id,
    );

    if (originalIndex > 0) {
      const prevTrackId = originalPlaylist[originalIndex - 1].id;
      play(prevTrackId, originalPlaylist);
    }
  }, [currentPlaylist, podcasts, play, findCurrentTrackIndex, currentTrack]);

  const playRandom = useCallback(() => {
    if (podcasts.length === 0) return;
    const randomIndex = Math.floor(Math.random() * podcasts.length);
    const randomPodcast = podcasts[randomIndex];
    play(randomPodcast.id, podcasts);
  }, [podcasts, play]);

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const seekForward = () => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.currentTime + 10, duration);
      seek(newTime);
    }
  };

  const seekBackward = () => {
    if (audioRef.current) {
      const newTime = Math.max(audioRef.current.currentTime - 10, 0);
      seek(newTime);
    }
  };

  const setVolume = (vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolumeState(vol);
    }
  };

  const setPlaybackRate = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setPlaybackRateState(rate);
  };

  const addToQueue = (track: Podcast) => {
    if (!queue.find((t) => t.id === track.id) && currentTrack?.id !== track.id) {
      setQueue((prev) => [...prev, track]);
    }
  };

  const playTrackFromQueue = (trackId: string) => {
    const trackIndex = queue.findIndex((t) => t.id === trackId);
    if (trackIndex !== -1) {
      const trackToPlay = queue[trackIndex];
      const newQueue = queue.slice(trackIndex + 1);

      setCurrentTrack(trackToPlay);
      setQueue(newQueue);
      setCurrentPlaylist([trackToPlay, ...newQueue]);
      addToHistory(trackToPlay);
      setAudioSource(trackToPlay, true);
    }
  };

  const removeFromQueue = (trackId: string) => {
    setQueue((prev) => prev.filter((t) => t.id !== trackId));
  };
  
  const moveTrackInQueue = (trackId: string, direction: "up" | "down") => {
    setQueue(prevQueue => {
      const index = prevQueue.findIndex(t => t.id === trackId);
      if (index === -1) return prevQueue;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prevQueue.length) return prevQueue;
      
      const newQueue = [...prevQueue];
      const [movedTrack] = newQueue.splice(index, 1);
      newQueue.splice(newIndex, 0, movedTrack);
      
      return newQueue;
    });
  };


  const onTimeUpdate = () => {
    if (audioRef.current) {
      const now = Date.now();
      const delta = (now - lastTimeUpdate.current) / 1000;
      lastTimeUpdate.current = now;

      if (isPlayingRef.current && delta > 0 && delta < 5) {
        setListeningLog((prevLog) => {
          const today = new Date().toISOString().split("T")[0];
          const newLog = {
            ...prevLog,
            [today]: (prevLog[today] || 0) + delta,
          };
          saveListeningLog(newLog);
          return newLog;
        });
      }

      const currentTime = audioRef.current.currentTime;
      const currentDuration = audioRef.current.duration;
      setProgress(currentTime);
      if (currentTrack) {
        saveProgress(currentTrack.id, currentTime, currentDuration);
      }
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const setSleepTimer = useCallback(
    (minutes: number | null) => {
      if (sleepTimerId.current) {
        clearTimeout(sleepTimerId.current);
        sleepTimerId.current = null;
      }
      if (sleepTimerIntervalId.current) {
        clearInterval(sleepTimerIntervalId.current);
        sleepTimerIntervalId.current = null;
      }

      if (minutes === null) {
        setSleepTimerState({ timeLeft: null, isActive: false });
        return;
      }

      const endTime = Date.now() + minutes * 60 * 1000;
      setSleepTimerState({ timeLeft: minutes * 60, isActive: true });

      sleepTimerId.current = setTimeout(() => {
        pause();
        setSleepTimerState({ timeLeft: null, isActive: false });
        if (sleepTimerIntervalId.current) {
          clearInterval(sleepTimerIntervalId.current);
        }
      }, minutes * 60 * 1000);

      sleepTimerIntervalId.current = setInterval(() => {
        const newTimeLeft = Math.round((endTime - Date.now()) / 1000);
        if (newTimeLeft > 0) {
          setSleepTimerState({ timeLeft: newTimeLeft, isActive: true });
        } else {
          setSleepTimerState({ timeLeft: null, isActive: false });
          if (sleepTimerIntervalId.current) {
            clearInterval(sleepTimerIntervalId.current);
          }
        }
      }, 1000);
    },
    [pause],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const throttledTimeUpdate = onTimeUpdate;
      audio.addEventListener("timeupdate", throttledTimeUpdate);
      audio.addEventListener("play", () => (lastTimeUpdate.current = Date.now()));
      audio.addEventListener("pause", onTimeUpdate); // Log remaining time on pause
      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      audio.addEventListener("ended", nextTrack);

      return () => {
        audio.removeEventListener("timeupdate", throttledTimeUpdate);
        audio.removeEventListener(
          "play",
          () => (lastTimeUpdate.current = Date.now()),
        );
        audio.removeEventListener("pause", onTimeUpdate);
        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        audio.removeEventListener("ended", nextTrack);
      };
    }
  }, [nextTrack]);

  const value = {
    currentTrack,
    isPlaying,
    play,
    autoPlay,
    pause,
    togglePlay,
    nextTrack,
    prevTrack,
    playRandom,
    audioRef,
    progress,
    duration,
    seek,
    seekForward,
    seekBackward,
    volume,
    setVolume,
    history,
    queue,
    setQueue,
    addToQueue,
    playTrackFromQueue,
    removeFromQueue,
    moveTrackInQueue,
    playbackRate,
    setPlaybackRate,
    getPodcastProgress,
    sleepTimer,
    setSleepTimer,
    listeningLog,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} />
    </PlayerContext.Provider>
  );
};

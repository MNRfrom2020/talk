
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
import { useDownload } from "@/context/DownloadContext";

const HISTORY_STORAGE_KEY = "podcast_history";
const PROGRESS_STORAGE_KEY = "podcast_progress";

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

interface PlayerContextType {
  currentTrack: Podcast | null;
  isPlaying: boolean;
  play: (trackId?: string, playlist?: Podcast[]) => void;
  pause: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  playRandom: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  progress: number;
  duration: number;
  seek: (time: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  history: Podcast[];
  queue: Podcast[];
  addToQueue: (track: Podcast) => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  getPodcastProgress: (trackId: string) => ProgressInfo | undefined;
  sleepTimer: SleepTimerInfo;
  setSleepTimer: (minutes: number | null) => void;
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
  const { getDownloadedPodcast } = useDownload();
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const isPlayingRef = React.useRef(isPlaying);
  const currentBlobUrl = useRef<string | null>(null);
  const sleepTimerId = useRef<NodeJS.Timeout | null>(null);
  const sleepTimerIntervalId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load history and progress from localStorage on initial mount
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
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  // Revoke blob URL on cleanup
  useEffect(() => {
    return () => {
      if (currentBlobUrl.current) {
        URL.revokeObjectURL(currentBlobUrl.current);
        currentBlobUrl.current = null;
      }
      if (sleepTimerId.current) clearTimeout(sleepTimerId.current);
      if (sleepTimerIntervalId.current)
        clearInterval(sleepTimerIntervalId.current);
    };
  }, []);

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
    async (track: Podcast) => {
      if (!audioRef.current) return;

      if (currentBlobUrl.current) {
        URL.revokeObjectURL(currentBlobUrl.current);
        currentBlobUrl.current = null;
      }

      const downloaded = await getDownloadedPodcast(track.id);
      let sourceUrl: string;

      if (downloaded) {
        sourceUrl = URL.createObjectURL(downloaded.blob);
        currentBlobUrl.current = sourceUrl;
      } else {
        sourceUrl = track.audioUrl;
      }

      const savedProgress = getPodcastProgress(track.id);

      if (audioRef.current.src !== sourceUrl) {
        audioRef.current.src = sourceUrl;
        audioRef.current.load();
      }

      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (savedProgress && savedProgress.progress > 0) {
              audioRef.current!.currentTime = savedProgress.progress;
            }
            setIsPlaying(true);
            audioRef.current!.playbackRate = playbackRate;
          })
          .catch((e) => {
            console.error("Playback failed", e);
            setIsPlaying(false);
          });
      }
    },
    [getDownloadedPodcast, playbackRate, getPodcastProgress],
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

  const play = useCallback(
    (trackId?: string, playlist: Podcast[] = podcasts) => {
      const playlistToUse = playlist && playlist.length > 0 ? playlist : podcasts;
      setCurrentPlaylist(playlistToUse);

      let trackToPlay: Podcast | undefined | null = null;
      if (trackId) {
        trackToPlay = playlistToUse.find((p) => p.id === trackId);
      } else {
        trackToPlay =
          currentTrack || (playlistToUse.length > 0 ? playlistToUse[0] : null);
      }

      if (trackToPlay) {
        if (currentTrack?.id !== trackToPlay.id) {
          setCurrentTrack(trackToPlay);
          addToHistory(trackToPlay);
          setAudioSource(trackToPlay);
        } else {
          audioRef.current
            ?.play()
            .then(() => setIsPlaying(true))
            .catch((e) => console.error("Playback failed", e));
        }
      }
    },
    [podcasts, currentTrack, addToHistory, setAudioSource],
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
      play(nextTrackInQueue.id, [nextTrackInQueue, ...(currentPlaylist || [])]);
      return true;
    }
    return false;
  }, [queue, play, currentPlaylist]);

  const nextTrack = useCallback(() => {
    if (playNextInQueue()) return;

    const playlist = currentPlaylist || podcasts;
    if (!playlist || playlist.length === 0) return;
    const currentIndex = findCurrentTrackIndex();
    if (currentIndex === -1) {
      play(playlist[0].id, playlist);
      return;
    }
    const nextIndex = (currentIndex + 1) % playlist.length;
    play(playlist[nextIndex].id, playlist);
  }, [currentPlaylist, podcasts, play, findCurrentTrackIndex, playNextInQueue]);

  const prevTrack = useCallback(() => {
    const playlist = currentPlaylist || podcasts;
    if (!playlist || playlist.length === 0) return;
    const currentIndex = findCurrentTrackIndex();
    if (currentIndex === -1) {
      play(playlist[0].id, playlist);
      return;
    }
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    play(playlist[prevIndex].id, playlist);
  }, [currentPlaylist, podcasts, play, findCurrentTrackIndex]);

  const playRandom = useCallback(() => {
    if (podcasts.length === 0) return;
    const randomIndex = Math.floor(Math.random() * podcasts.length);
    const randomPodcast = podcasts[randomIndex];
    play(randomPodcast.id, currentPlaylist || podcasts);
  }, [podcasts, play, currentPlaylist]);

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
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
    setQueue((prev) => [...prev, track]);
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
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
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      audio.addEventListener("ended", nextTrack);

      return () => {
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        audio.removeEventListener("ended", nextTrack);
      };
    }
  }, [nextTrack, onTimeUpdate, onLoadedMetadata]);

  const value = {
    currentTrack,
    isPlaying,
    play,
    pause,
    togglePlay,
    nextTrack,
    prevTrack,
    playRandom,
    audioRef,
    progress,
    duration,
    seek,
    volume,
    setVolume,
    history,
    queue,
    addToQueue,
    playbackRate,
    setPlaybackRate,
    getPodcastProgress,
    sleepTimer,
    setSleepTimer,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} />
    </PlayerContext.Provider>
  );
};

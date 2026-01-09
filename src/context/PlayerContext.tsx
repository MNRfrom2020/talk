
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
import { useUser } from "./UserContext";
import { supabase } from "@/lib/supabase";
import { upsertListeningHistory } from "@/lib/actions";
import { getListeningActivity } from "@/lib/data";
import { getAudio } from "@/lib/idb";


const HISTORY_STORAGE_KEY = "podcast_history";
const LISTENING_LOG_KEY = "listening_log";
const PLAYER_VOLUME_KEY = "player_volume";
const PLAYBACK_PROGRESS_KEY = "playback_progress";
const PODCAST_DURATIONS_KEY = "podcast_durations";
const LAST_PLAYED_STORAGE_KEY = "last_played_podcast";


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

interface SleepTimerInfo {
  timeLeft: number | null;
  isActive: boolean;
}

type ListeningLog = Record<string, number>; // { 'YYYY-MM-DD': seconds }
type PlaybackProgress = Record<string, number>; // { 'podcastId': seconds }
type PodcastDurations = Record<string, number>; // { 'podcastId': seconds }
type RepeatMode = "off" | "one" | "all";

interface PlayOptions {
  expand?: boolean;
}

interface PlayerContextType {
  currentTrack: Podcast | null;
  isPlaying: boolean;
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  play: (
    trackId?: string,
    playlist?: Podcast[],
    options?: PlayOptions,
  ) => void;
  autoPlay: (trackId?: string, playlist?: Podcast[]) => void;
  pause: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  playRandom: (podcasts: Podcast[]) => void;
  toggleShuffle: () => void;
  isShuffled: boolean;
  closePlayer: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  progress: number;
  duration: number;
  seek: (time: number) => void;
  seekForward: () => void;
  seekBackward: () => void;
  handleProgressChange: (value: number[]) => void;
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
  sleepTimer: SleepTimerInfo;
  setSleepTimer: (minutes: number | null) => void;
  listeningLog: ListeningLog;
  repeatMode: RepeatMode;
  setRepeatMode: React.Dispatch<React.SetStateAction<RepeatMode>>;
  toggleRepeatMode: () => void;
  playbackProgress: PlaybackProgress;
  podcastDurations: PodcastDurations;
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
  const { user } = useUser();
  const [currentTrack, setCurrentTrack] = useState<Podcast | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Podcast[] | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [history, setHistory] = useState<Podcast[]>([]);
  const [queue, setQueue] = useState<Podcast[]>([]);
  const [originalQueue, setOriginalQueue] = useState<Podcast[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [sleepTimer, setSleepTimerState] = useState<SleepTimerInfo>({
    timeLeft: null,
    isActive: false,
  });
  const [listeningLog, setListeningLog] = useState<ListeningLog>({});
  const [playbackProgress, setPlaybackProgress] = useState<PlaybackProgress>({});
  const [podcastDurations, setPodcastDurations] = useState<PodcastDurations>({});
  const audioRef = useRef<HTMLAudioElement>(null);
  const playPromiseController = useRef<AbortController | null>(null);
  const lastTimeUpdate = useRef(0);
  const isPlayingRef = React.useRef(isPlaying);
  const sleepTimerId = useRef<NodeJS.Timeout | null>(null);
  const sleepTimerIntervalId = useRef<NodeJS.Timeout | null>(null);
  const currentBlobUrl = useRef<string | null>(null);


  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load data from localStorage or DB on initial mount
  useEffect(() => {
    const loadData = async () => {
      // Clear guest data first if user is logged in
      if (user.uid && !user.isGuest) {
        localStorage.removeItem(HISTORY_STORAGE_KEY);
        localStorage.removeItem(LISTENING_LOG_KEY);
        localStorage.removeItem(LAST_PLAYED_STORAGE_KEY);
        setHistory([]); // Reset history state
        setListeningLog({}); // Reset log state
      }
      
      let loadedHistory: Podcast[] = [];

      if (user.isGuest) {
        try {
          const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
          if (storedHistory) loadedHistory = JSON.parse(storedHistory);
          setHistory(loadedHistory);
          
          const storedLog = localStorage.getItem(LISTENING_LOG_KEY);
          if (storedLog) setListeningLog(JSON.parse(storedLog));

        } catch (error) {
          console.error("Failed to load guest data from localStorage", error);
        }
      } else if (user.uid) {
        // --- LOGGED-IN USER ---
        // Fetch from DB for logged-in user
        const { data: listeningHistory, error } = await supabase
          .from("listening_history")
          .select("podcast_id, last_played_at")
          .eq("user_uid", user.uid)
          .order("last_played_at", { ascending: false });

        if (error) {
          console.error("Error fetching listening history:", error);
        } else if (listeningHistory && listeningHistory.length > 0) {
          const podcastIds = listeningHistory.map(item => item.podcast_id);
          const { data: podcastsData, error: podcastsError } = await supabase
            .from("podcasts")
            .select("*")
            .in("id", podcastIds);

          if (podcastsError) {
             console.error("Error fetching podcasts for history:", podcastsError);
          } else {
            const podcastsMap = new Map(podcastsData.map(p => [String(p.id), p]));
            const dbHistory: Podcast[] = listeningHistory.map(item => {
               const podcastDetails = podcastsMap.get(String(item.podcast_id));
               if (!podcastDetails) return null;
                return {
                  id: String(podcastDetails.id),
                  title: podcastDetails.title,
                  artist: podcastDetails.artist,
                  categories: podcastDetails.categories,
                  coverArt: podcastDetails.cover_art,
                  coverArtHint: podcastDetails.cover_art_hint,
                  audioUrl: podcastDetails.audio_url,
                  created_at: podcastDetails.created_at,
                };
            }).filter((p): p is Podcast => p !== null);
            loadedHistory = dbHistory;
            setHistory(loadedHistory);
          }
        }
        
        // Fetch listening activity log for chart
        const activityLog = await getListeningActivity(user.uid);
        setListeningLog(activityLog);
      }
      
      // Load volume, playback progress, and last played track for all users
      try {
        const storedVolume = localStorage.getItem(PLAYER_VOLUME_KEY);
        if (storedVolume) {
          const parsedVolume = parseFloat(storedVolume);
          if (!isNaN(parsedVolume)) {
            setVolumeState(parsedVolume);
            if (audioRef.current) audioRef.current.volume = parsedVolume;
          }
        }
        const storedProgress = localStorage.getItem(PLAYBACK_PROGRESS_KEY);
        if (storedProgress) {
            setPlaybackProgress(JSON.parse(storedProgress));
        }
        const storedDurations = localStorage.getItem(PODCAST_DURATIONS_KEY);
        if (storedDurations) {
            setPodcastDurations(JSON.parse(storedDurations));
        }
         const lastPlayedTrackJSON = localStorage.getItem(LAST_PLAYED_STORAGE_KEY);
        if (lastPlayedTrackJSON) {
            const lastPlayedTrack = JSON.parse(lastPlayedTrackJSON) as Podcast;
            const fullTrackDetails = podcasts.find(p => p.id === lastPlayedTrack.id) || lastPlayedTrack;
            setCurrentTrack(fullTrackDetails);
            setAudioSource(fullTrackDetails, false);
        }

      } catch (error) {
        console.error("Failed to load player settings from localStorage", error);
      }
    };
    if (!user.loading && podcasts.length > 0) {
      loadData();
    }
  }, [user, podcasts]);

  // Cleanup timers and blob URL
  useEffect(() => {
    return () => {
      if (sleepTimerId.current) clearTimeout(sleepTimerId.current);
      if (sleepTimerIntervalId.current)
        clearInterval(sleepTimerIntervalId.current);
      if (currentBlobUrl.current) {
        URL.revokeObjectURL(currentBlobUrl.current);
      }
    };
  }, []);

  const saveListeningLog = useThrottle((log: ListeningLog) => {
    if (user.isGuest) {
      try {
        localStorage.setItem(LISTENING_LOG_KEY, JSON.stringify(log));
      } catch (error) {
        console.error("Failed to save listening log", error);
      }
    }
  }, 5000);

  const savePlaybackProgress = useThrottle((trackId: string, currentTime: number, duration: number) => {
    setPlaybackProgress(currentProgress => {
      const newProgress = { ...currentProgress };
      if (duration > 0 && duration - currentTime < 10) {
        // If track is finished, reset progress
        delete newProgress[trackId]; 
      } else {
        newProgress[trackId] = currentTime;
      }
      
      try {
          localStorage.setItem(PLAYBACK_PROGRESS_KEY, JSON.stringify(newProgress));
      } catch (e) {
          console.error("Failed to save playback progress", e);
      }
      return newProgress;
    });
  }, 5000);

  const pause = useCallback(() => {
    if (playPromiseController.current) {
      playPromiseController.current.abort();
    }
    if (audioRef.current && currentTrack) {
        savePlaybackProgress(currentTrack.id, audioRef.current.currentTime, audioRef.current.duration);
    }
    audioRef.current?.pause();
    setIsPlaying(false);
  }, [currentTrack, savePlaybackProgress]);

  const setAudioSource = useCallback(
    async (
      track: Podcast,
      shouldAutoPlay = true,
      options: PlayOptions = {},
    ) => {
      if (!audioRef.current) return;

      // Revoke previous blob URL if it exists
      if (currentBlobUrl.current) {
        URL.revokeObjectURL(currentBlobUrl.current);
        currentBlobUrl.current = null;
      }

      let sourceUrl = track.audioUrl;
      const offlineAudio = await getAudio(track.id);

      if (offlineAudio) {
        sourceUrl = URL.createObjectURL(offlineAudio);
        currentBlobUrl.current = sourceUrl;
      }
  
      if (audioRef.current.src !== sourceUrl) {
        audioRef.current.src = sourceUrl;
      }
      
      const savedProgress = playbackProgress[track.id];
      if (savedProgress && savedProgress > 0) {
          // Setting currentTime can only happen after metadata is loaded
          const setTime = () => {
             if(audioRef.current) {
                audioRef.current.currentTime = savedProgress;
             }
             audioRef.current?.removeEventListener('loadedmetadata', setTime);
          }
          audioRef.current.addEventListener('loadedmetadata', setTime);
      } else {
          setProgress(0);
      }
  
      if (options.expand) {
        setIsExpanded(true);
      }
  
      if (!shouldAutoPlay) {
        setIsPlaying(false);
        return;
      }
  
      if (playPromiseController.current) {
        playPromiseController.current.abort();
      }
      playPromiseController.current = new AbortController();
      const { signal } = playPromiseController.current;
  
      try {
        await audioRef.current.play();
        if (signal.aborted) {
          return;
        }
  
        setIsPlaying(true);
        audioRef.current.playbackRate = playbackRate;
        lastTimeUpdate.current = Date.now();
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("Playback failed", e);
          setIsPlaying(false);
        }
      } finally {
        if (!signal.aborted) {
          playPromiseController.current = null;
        }
      }
    },
    [playbackRate, playbackProgress],
  );

  const addToHistory = useCallback((track: Podcast) => {
    const newHistory = [
      track,
      ...history.filter((item) => item.id !== track.id),
    ].slice(0, 50);
    
    setHistory(newHistory);
     try {
        localStorage.setItem(LAST_PLAYED_STORAGE_KEY, JSON.stringify(track));
    } catch(e) {
        console.error("Failed to save last played track", e);
    }
    
    if (user.isGuest) {
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
      } catch (error) {
        console.error("Failed to save history to localStorage", error);
      }
    } else if (user.uid && track.id) {
        upsertListeningHistory({
            user_uid: user.uid,
            podcast_id: track.id,
        });
    }
  }, [history, user]);

  const playInternal = useCallback(
    (
      trackId?: string,
      playlist: Podcast[] = podcasts,
      shouldAutoPlay = true,
      options: PlayOptions = {},
    ) => {
      // Save progress of the current track before switching
      if (audioRef.current && currentTrack) {
        savePlaybackProgress(currentTrack.id, audioRef.current.currentTime, audioRef.current.duration);
      }
        
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
        if (options.expand) {
          setIsExpanded(true);
        }
        
        if (currentTrack?.id !== trackToPlay.id) {
          const newQueue = playlistToUse.slice(startFromIndex + 1);
          setCurrentPlaylist(playlistToUse);
          setQueue(newQueue);
          setOriginalQueue(newQueue);
          setIsShuffled(false); 
          setCurrentTrack(trackToPlay);
          setProgress(0);
          addToHistory(trackToPlay);
        }

        setAudioSource(trackToPlay, shouldAutoPlay, options);
      }
    },
    [podcasts, currentTrack, addToHistory, setAudioSource, savePlaybackProgress],
  );

  const play = useCallback(
    (trackId?: string, playlist?: Podcast[], options?: PlayOptions) => {
      playInternal(trackId, playlist, true, options);
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
      play(playlist[0].id, playlist, { expand: true });
      return;
    }

    if (isPlaying) {
      pause();
    } else {
      if (audioRef.current) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Toggle play failed", e));
      }
    }
  }, [isPlaying, pause, play, currentTrack, podcasts, currentPlaylist]);

  const findCurrentTrackIndex = useCallback(() => {
    const playlist = currentPlaylist || podcasts;
    return currentTrack
      ? playlist.findIndex((p) => p.id === currentTrack.id)
      : -1;
  }, [currentTrack, podcasts, currentPlaylist]);

  const playTrackFromQueue = useCallback(
    (trackId: string, options?: PlayOptions) => {
      const trackIndex = queue.findIndex((t) => t.id === trackId);
      if (trackIndex !== -1) {
        const trackToPlay = queue[trackIndex];
        const newQueue = queue.slice(trackIndex + 1);
        
        // Save progress of the old track before switching
        if (audioRef.current && currentTrack) {
            savePlaybackProgress(currentTrack.id, audioRef.current.currentTime, audioRef.current.duration);
        }
        
        setCurrentTrack(trackToPlay);
        addToHistory(trackToPlay);
        setQueue(newQueue);

        if (!isShuffled) {
          setOriginalQueue(newQueue);
        }

        const fullRemainingPlaylist = [trackToPlay, ...newQueue];
        if (currentPlaylist) {
          const currentTrackIdxInFullPlaylist = currentPlaylist.findIndex(p => p.id === trackToPlay.id);
          if (currentTrackIdxInFullPlaylist === -1) {
             setCurrentPlaylist(fullRemainingPlaylist);
          }
        } else {
          setCurrentPlaylist(fullRemainingPlaylist);
        }

        setAudioSource(trackToPlay, true, options);
      }
    },
    [queue, addToHistory, setAudioSource, isShuffled, currentPlaylist, currentTrack, savePlaybackProgress]
  );

  const nextTrack = useCallback(() => {
    if (queue.length > 0) {
      const nextTrackInQueue = queue[0];
      playTrackFromQueue(nextTrackInQueue.id);
      return;
    }

    if (repeatMode === "all" && currentPlaylist && currentPlaylist.length > 0) {
      const currentIndex = findCurrentTrackIndex();
      const nextIndex = (currentIndex + 1) % currentPlaylist.length;
      play(currentPlaylist[nextIndex].id, currentPlaylist);
    }
  }, [queue, play, playTrackFromQueue, currentPlaylist, repeatMode, findCurrentTrackIndex]);

  const prevTrack = useCallback(() => {
    const playlist = currentPlaylist || podcasts;
    if (!playlist || playlist.length === 0) return;
    
    const currentIndex = findCurrentTrackIndex();

    if (currentIndex > 0) {
      const prevTrackId = playlist[currentIndex - 1].id;
      play(prevTrackId, playlist);
    } else if (repeatMode === "all") {
      const lastTrackId = playlist[playlist.length - 1].id;
      play(lastTrackId, playlist);
    }
  }, [currentPlaylist, podcasts, play, findCurrentTrackIndex, repeatMode]);

  const playRandom = useCallback((podcastsToShuffle: Podcast[]) => {
    if (podcastsToShuffle.length === 0) return;
    const randomIndex = Math.floor(Math.random() * podcastsToShuffle.length);
    const randomPodcast = podcastsToShuffle[randomIndex];
    play(randomPodcast.id, podcastsToShuffle);
  }, [play]);

  const toggleShuffle = useCallback(() => {
    if (isShuffled) {
      setQueue(originalQueue);
      setIsShuffled(false);
    } else {
      const shuffled = [...queue];
      // Fisher-Yates (aka Knuth) Shuffle
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setQueue(shuffled);
      setIsShuffled(true);
    }
  }, [isShuffled, queue, originalQueue]);


  const closePlayer = useCallback(() => {
    if (audioRef.current) {
      pause();
      audioRef.current.src = "";
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setQueue([]);
    setCurrentPlaylist(null);
    setProgress(0);
    setDuration(0);
    try {
        localStorage.removeItem(LAST_PLAYED_STORAGE_KEY);
    } catch(e) {
        console.error("Failed to remove last played track", e);
    }
  }, [pause]);

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const handleProgressChange = (value: number[]) => {
    seek(value[0]);
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
      try {
        localStorage.setItem(PLAYER_VOLUME_KEY, vol.toString());
      } catch (error) {
        console.error("Failed to save volume to localStorage", error);
      }
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
       const newQueue = [...queue, track];
       setQueue(newQueue);
       if (!isShuffled) {
         setOriginalQueue(newQueue);
       }
    }
  };

  const removeFromQueue = (trackId: string) => {
    const newQueue = queue.filter((t) => t.id !== trackId);
    setQueue(newQueue);
     if (!isShuffled) {
        setOriginalQueue(newQueue);
     } else {
        setOriginalQueue(originalQueue.filter((t) => t.id !== trackId));
     }
  };
  
  const moveTrackInQueue = (trackId: string, direction: "up" | "down") => {
    const reorder = (list: Podcast[]) => {
      const index = list.findIndex(t => t.id === trackId);
      if (index === -1) return list;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= list.length) return list;
      
      const newList = [...list];
      const [movedTrack] = newList.splice(index, 1);
      newList.splice(newIndex, 0, movedTrack);
      
      return newList;
    }

    setQueue(prev => reorder(prev));
    if (!isShuffled) {
       setOriginalQueue(prev => reorder(prev));
    }
  };

  const toggleRepeatMode = () => {
    setRepeatMode((prev) => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
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
      
      if (currentTrack && !isNaN(currentDuration) && currentDuration > 0) {
        savePlaybackProgress(currentTrack.id, currentTime, currentDuration);
      }
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current && currentTrack) {
        const currentDuration = audioRef.current.duration;
        setDuration(currentDuration);
        setPodcastDurations(prev => {
            const newDurations = { ...prev, [currentTrack.id]: currentDuration };
            try {
                localStorage.setItem(PODCAST_DURATIONS_KEY, JSON.stringify(newDurations));
            } catch (e) {
                console.error("Failed to save durations", e);
            }
            return newDurations;
        });
    }
  };
  
  const handleTrackEnd = () => {
     if (currentTrack && audioRef.current) {
        savePlaybackProgress(currentTrack.id, audioRef.current.duration, audioRef.current.duration);
     }
    if (repeatMode === "one" && currentTrack) {
      seek(0);
      play(currentTrack.id);
    } else {
      nextTrack();
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
      audio.addEventListener("ended", handleTrackEnd);
      audio.volume = volume;

      return () => {
        audio.removeEventListener("timeupdate", throttledTimeUpdate);
        audio.removeEventListener(
          "play",
          () => (lastTimeUpdate.current = Date.now()),
        );
        audio.removeEventListener("pause", onTimeUpdate);
        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        audio.removeEventListener("ended", handleTrackEnd);
      };
    }
  }, [handleTrackEnd, volume, currentTrack]);

   // Media Session API Integration
  useEffect(() => {
    if ("mediaSession" in navigator) {
      if (currentTrack) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: Array.isArray(currentTrack.artist)
            ? currentTrack.artist.join(", ")
            : currentTrack.artist,
          album: "MNR Talk",
          artwork: [
            { src: currentTrack.coverArt, sizes: "96x96", type: "image/png" },
            { src: currentTrack.coverArt, sizes: "128x128", type: "image/png" },
            { src: currentTrack.coverArt, sizes: "192x192", type: "image/png" },
            { src: currentTrack.coverArt, sizes: "256x256", type: "image/png" },
            { src: currentTrack.coverArt, sizes: "384x384", type: "image/png" },
            { src: currentTrack.coverArt, sizes: "512x512", type: "image/png" },
          ],
        });

        navigator.mediaSession.setActionHandler("play", () => togglePlay());
        navigator.mediaSession.setActionHandler("pause", () => togglePlay());
        navigator.mediaSession.setActionHandler("previoustrack", () => prevTrack());
        navigator.mediaSession.setActionHandler("nexttrack", () => nextTrack());
        navigator.mediaSession.setActionHandler("seekbackward", () => seekBackward());
        navigator.mediaSession.setActionHandler("seekforward", () => seekForward());

        // Update position state for the media session
        const updatePositionState = () => {
          if (audioRef.current) {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration || 0,
              playbackRate: audioRef.current.playbackRate,
              position: audioRef.current.currentTime || 0,
            });
          }
        };

        const intervalId = setInterval(updatePositionState, 1000);
        return () => clearInterval(intervalId);

      } else {
        // Clear media session when no track is playing
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("seekbackward", null);
        navigator.mediaSession.setActionHandler("seekforward", null);
      }
    }
  }, [currentTrack, togglePlay, prevTrack, nextTrack, seekBackward, seekForward, audioRef]);

  // Update playback state for Media Session
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);


  const value = {
    currentTrack,
    isPlaying,
    isExpanded,
    setIsExpanded,
    play,
    autoPlay,
    pause,
    togglePlay,
    nextTrack,
    prevTrack,
    playRandom,
    toggleShuffle,
    isShuffled,
    closePlayer,
    audioRef,
    progress,
    duration,
    seek,
    seekForward,
    seekBackward,
    handleProgressChange,
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
    sleepTimer,
    setSleepTimer,
    listeningLog,
    repeatMode,
    setRepeatMode,
    toggleRepeatMode,
    playbackProgress,
    podcastDurations,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} />
    </PlayerContext.Provider>
  );
};

    
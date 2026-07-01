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
import { apiClient } from "@/lib/api-client";
import { getListeningActivity } from "@/lib/data";
import { getAudio } from "@/lib/idb";
import { getAllProgress, saveProgress } from "@/lib/audioProgressDB";
import { upsertListeningHistory } from "@/lib/actions";


const HISTORY_STORAGE_KEY = "podcast_history";
const LISTENING_LOG_KEY = "listening_log";
const PLAYER_VOLUME_KEY = "player_volume";
const PODCAST_DURATIONS_KEY = "podcast_durations";
const LAST_PLAYED_STORAGE_KEY = "last_played_podcast";

const hasSuperUserRole = (role?: string | string[]) => {
  const userRoles = Array.isArray(role) ? role : [role || ""];
  return userRoles.some((item) => item.toLowerCase().trim() === "super user");
};


// --- useThrottle Hook ---
function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
) {
  const lastCall = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  stopWhenCurrentTrackEnds: boolean;
  stopWhenPlaylistEnds: boolean;
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
  setSleepTimer: (minutes: number | null, options?: { stopWhenCurrentTrackEnds?: boolean; stopWhenPlaylistEnds?: boolean }) => void;
  listeningLog: ListeningLog;
  repeatMode: RepeatMode;
  setRepeatMode: React.Dispatch<React.SetStateAction<RepeatMode>>;
  toggleRepeatMode: () => void;
  playbackProgress: PlaybackProgress;
  podcastDurations: PodcastDurations;
  loadListeningHistory: () => Promise<void>;
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
  const { user, loading: userLoading } = useUser();
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
    stopWhenCurrentTrackEnds: false,
    stopWhenPlaylistEnds: false,
  });
  const [listeningLog, setListeningLog] = useState<ListeningLog>({});
  const [playbackProgress, setPlaybackProgress] = useState<PlaybackProgress>({});
  const [podcastDurations, setPodcastDurations] = useState<PodcastDurations>({});
  const audioRef = useRef<HTMLAudioElement>(null);
  const playPromiseController = useRef<AbortController | null>(null);
  const lastTimeUpdate = useRef(0);
  const isPlayingRef = React.useRef(isPlaying);
  const sleepTimerId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimerIntervalId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentBlobUrl = useRef<string | null>(null);


  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load data from localStorage or DB on initial mount
  useEffect(() => {
    const loadData = async () => {
      const needsCloudSync = !!user.uid && hasSuperUserRole(user.role);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🏠 LOCAL USERS (Guest + Normal MNR users): Use generic keys
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (user.isGuest || !needsCloudSync) {
        try {
          const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
          if (storedHistory) {
            const parsed = JSON.parse(storedHistory);
            setHistory(parsed);
          }

          const storedLog = localStorage.getItem(LISTENING_LOG_KEY);
          if (storedLog) {
            setListeningLog(JSON.parse(storedLog));
          }
        } catch (error) {
          console.error("Failed to load local data", error);
        }
        return;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ☁️ SUPER USERS: Use cloud sync with UUID
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const cloudUserUid = user.uid;
      if (!cloudUserUid) {
        return;
      }


      // Fetch cloud history
      try {
        const historyData = await apiClient.get("listening_history.php", { action: "list", user_uid: cloudUserUid });
        const cloudHistory: Podcast[] = (historyData || []).map((p: any) => ({
          id: String(p.id),
          title: p.title,
          artist: Array.isArray(p.artist) ? p.artist : [p.artist],
          categories: Array.isArray(p.categories) ? p.categories : [p.categories],
          coverArt: p.cover_art,
          coverArtHint: p.cover_art_hint,
          audioUrl: p.audio_url,
          created_at: p.created_at,
        }));
        setHistory(cloudHistory);
      } catch (error) {
      }

      // Fetch listening activity log for chart
      try {
        const activityLog = await getListeningActivity(cloudUserUid);
        if (activityLog && Object.keys(activityLog).length > 0) {
          setListeningLog(activityLog);
        }
      } catch (err) {
        console.error("Error fetching listening activity:", err);
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
        // Load playback progress from IndexedDB (with 1-month expiry)
        const storedProgress = await getAllProgress();
        if (Object.keys(storedProgress).length > 0) {
            setPlaybackProgress(storedProgress);
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
    if (!userLoading && podcasts.length > 0) {
      loadData();
    }
  }, [user, podcasts, userLoading]);

  // 🎯 On-demand history loading function (call from Profile page)
  const loadListeningHistory = useCallback(async () => {
    if (user.isGuest) {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } else if (user.uid && hasSuperUserRole(user.role)) {
      try {
        const historyData = await apiClient.get("listening_history.php", { action: "list", user_uid: user.uid });
        const typedHistory: Podcast[] = (historyData || []).map((p: any) => ({
          id: String(p.id),
          title: p.title,
          artist: Array.isArray(p.artist) ? p.artist : [p.artist],
          categories: Array.isArray(p.categories) ? p.categories : [p.categories],
          coverArt: p.cover_art,
          coverArtHint: p.cover_art_hint,
          audioUrl: p.audio_url,
          created_at: p.created_at,
        }));
        setHistory(typedHistory);
      } catch (error) {
        console.error("Error fetching listening history:", error);
      }
    }
  }, [user]);

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
    try {
      const needsCloudSync = !!user.uid && hasSuperUserRole(user.role);

      if (needsCloudSync) {
        localStorage.setItem(`listening_log_${user.uid}`, JSON.stringify(log));
      } else {
        localStorage.setItem(LISTENING_LOG_KEY, JSON.stringify(log));
      }
    } catch (error) {
      console.error("Failed to save listening log", error);
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
      return newProgress;
    });
    // Persist to IndexedDB (10-second reset + expiry handled inside saveProgress)
    saveProgress(trackId, currentTime, duration).catch((e) =>
      console.error("Failed to save progress to IndexedDB", e),
    );
  }, 5000);

  const updateListeningHistoryDuration = useThrottle(
    (trackId: string, currentTime: number) => {
      // Only sync if user is logged in with a syncable role
      if (!user.uid || !user.needsCloudSync || user.isGuest) return;

      upsertListeningHistory({
        user_uid: user.uid,
        podcast_id: trackId,
        duration: Math.round(currentTime),
        role: user.role,
      });
    },
    30000, // Throttle: fire at most once every 30 seconds during playback
  );

  const pause = useCallback(() => {
    if (playPromiseController.current) {
      playPromiseController.current.abort();
    }
    if (audioRef.current && currentTrack) {
      const currentTime = audioRef.current.currentTime;
      savePlaybackProgress(currentTrack.id, currentTime, audioRef.current.duration);
      // Immediately sync to DB on pause (don't wait for throttle)
      if (user.uid && user.needsCloudSync && !user.isGuest) {
        upsertListeningHistory({
          user_uid: user.uid,
          podcast_id: currentTrack.id,
          duration: Math.round(currentTime),
          role: user.role,
        });
      }
    }
    audioRef.current?.pause();
    setIsPlaying(false);
  }, [currentTrack, savePlaybackProgress, user]);

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

      // Extra safety check: ensure audioRef.current still exists
      if (!audioRef.current) return;

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

    // ✅ Always save locally first (Offline-First)
    const needsCloudSync = !!user.uid && hasSuperUserRole(user.role);
    if (needsCloudSync) {
      const userSpecificKey = `listening_history_${user.uid}`;
      try {
        // Convert history to format suitable for local storage
        const historyForLocal = newHistory.map(podcast => ({
          podcast_id: podcast.id,
          title: podcast.title,
          artist: podcast.artist,
          categories: podcast.categories,
          cover_art: podcast.coverArt,
          cover_art_hint: podcast.coverArtHint,
          audio_url: podcast.audioUrl,
          last_played_at: new Date().toISOString(),
        }));
        localStorage.setItem(userSpecificKey, JSON.stringify(historyForLocal));
      } catch (error) {
        console.error("Failed to save history to localStorage", error);
      }
    }
    
    if (!needsCloudSync) {
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
      } catch (error) {
        console.error("Failed to save history to localStorage", error);
      }
    }
    
    // No cloud sync - data stays local only
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
      } else if (currentTrack) {
         trackToPlay = currentTrack;
         startFromIndex = playlistToUse.findIndex(
            (p) => p.id === trackToPlay!.id,
          );
      } else {
        trackToPlay = playlistToUse.length > 0 ? playlistToUse[0] : null;
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

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else {
      if (currentTrack) {
        if (audioRef.current) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Toggle play failed", e));
        }
      } else {
        let trackToPlayId: string | null = null;
        if (!user.isGuest && user.uid && hasSuperUserRole(user.role)) {
           try {
             const data = await apiClient.get("listening_history.php", { 
               action: "last_played", 
               user_uid: user.uid 
             });
             if (data && data.podcast_id) {
               trackToPlayId = String(data.podcast_id);
             }
           } catch (err) {
             console.error("Error fetching last played track:", err);
           }
        }
        
        if (trackToPlayId) {
            play(trackToPlayId, podcasts, { expand: false });
        } else {
            const lastPlayedJson = localStorage.getItem(LAST_PLAYED_STORAGE_KEY);
            if (lastPlayedJson) {
                const lastPlayed = JSON.parse(lastPlayedJson);
                play(lastPlayed.id, podcasts, { expand: false });
            } else if (podcasts.length > 0) {
                 play(podcasts[0].id, podcasts, { expand: false });
            }
        }
      }
    }
  }, [isPlaying, pause, play, currentTrack, podcasts, user]);

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

  const handleTrackEnd = useCallback(() => {
    if (currentTrack && audioRef.current) {
      const finalTime = audioRef.current.duration;
      savePlaybackProgress(currentTrack.id, finalTime, finalTime);
      // Sync final progress to DB on track end
      if (user.uid && user.needsCloudSync && !user.isGuest) {
        upsertListeningHistory({
          user_uid: user.uid,
          podcast_id: currentTrack.id,
          duration: Math.round(finalTime),
          role: user.role,
        });
      }
    }
    // Check if we should stop when current track ends
    if (sleepTimer.stopWhenCurrentTrackEnds) {
      pause();
      setSleepTimerState({ timeLeft: null, isActive: false, stopWhenCurrentTrackEnds: false, stopWhenPlaylistEnds: false });
      return;
    }

    // Check if we should stop when playlist ends
    if (sleepTimer.stopWhenPlaylistEnds) {
      // Check if there are more tracks in the queue or playlist
      const hasNextInQueue = queue.length > 0;
      const hasNextInPlaylist = repeatMode === "all" && currentPlaylist && currentPlaylist.length > 0;
      
      if (!hasNextInQueue && !hasNextInPlaylist) {
        // This is the last track
        pause();
        setSleepTimerState({ timeLeft: null, isActive: false, stopWhenCurrentTrackEnds: false, stopWhenPlaylistEnds: false });
        return;
      }
    }

    if (repeatMode === "one" && currentTrack) {
      seek(0);
      play(currentTrack.id);
    } else {
      nextTrack();
    }
  }, [currentTrack, sleepTimer, queue, currentPlaylist, repeatMode, pause, nextTrack, play, savePlaybackProgress, user]);

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
       if (currentBlobUrl.current) {
        URL.revokeObjectURL(currentBlobUrl.current);
        currentBlobUrl.current = null;
      }
    }
    // Don't clear last played track from local storage
    const lastTrack = currentTrack;
    if(lastTrack) {
       try {
        localStorage.setItem(LAST_PLAYED_STORAGE_KEY, JSON.stringify(lastTrack));
      } catch(e) {
          console.error("Failed to save last played track", e);
      }
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setQueue([]);
    setCurrentPlaylist(null);
    setProgress(0);
    setDuration(0);
  }, [pause, currentTrack]);

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
        if (isPlayingRef.current) {
            updateListeningHistoryDuration(currentTrack.id, currentTime);
        }
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


  const setSleepTimer = useCallback(
    (minutes: number | null, options?: { stopWhenCurrentTrackEnds?: boolean; stopWhenPlaylistEnds?: boolean }) => {
      if (sleepTimerId.current) {
        clearTimeout(sleepTimerId.current);
        sleepTimerId.current = null;
      }
      if (sleepTimerIntervalId.current) {
        clearInterval(sleepTimerIntervalId.current);
        sleepTimerIntervalId.current = null;
      }

      if (minutes === null && !options?.stopWhenCurrentTrackEnds && !options?.stopWhenPlaylistEnds) {
        setSleepTimerState({ timeLeft: null, isActive: false, stopWhenCurrentTrackEnds: false, stopWhenPlaylistEnds: false });
        return;
      }

      // Handle stop when current track ends
      if (options?.stopWhenCurrentTrackEnds) {
        setSleepTimerState({ 
          timeLeft: null, 
          isActive: true, 
          stopWhenCurrentTrackEnds: true,
          stopWhenPlaylistEnds: false 
        });
        return;
      }

      // Handle stop when playlist ends
      if (options?.stopWhenPlaylistEnds) {
        setSleepTimerState({ 
          timeLeft: null, 
          isActive: true, 
          stopWhenCurrentTrackEnds: false,
          stopWhenPlaylistEnds: true 
        });
        return;
      }

      // Handle time-based timer
      if (minutes === null || minutes <= 0) {
        setSleepTimerState({ timeLeft: null, isActive: false, stopWhenCurrentTrackEnds: false, stopWhenPlaylistEnds: false });
        return;
      }

      const endTime = Date.now() + minutes * 60 * 1000;
      setSleepTimerState({ timeLeft: minutes * 60, isActive: true, stopWhenCurrentTrackEnds: false, stopWhenPlaylistEnds: false });

      sleepTimerId.current = setTimeout(() => {
        pause();
        setSleepTimerState({ timeLeft: null, isActive: false, stopWhenCurrentTrackEnds: false, stopWhenPlaylistEnds: false });
        if (sleepTimerIntervalId.current) {
          clearInterval(sleepTimerIntervalId.current);
        }
      }, minutes * 60 * 1000);

      sleepTimerIntervalId.current = setInterval(() => {
        const newTimeLeft = Math.round((endTime - Date.now()) / 1000);
        if (newTimeLeft > 0) {
          setSleepTimerState({ timeLeft: newTimeLeft, isActive: true, stopWhenCurrentTrackEnds: false, stopWhenPlaylistEnds: false });
        } else {
          setSleepTimerState({ timeLeft: null, isActive: false, stopWhenCurrentTrackEnds: false, stopWhenPlaylistEnds: false });
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
        // Fallback image if coverArt is not available
        const coverArtUrl = currentTrack.coverArt || 'https://placehold.co/512x512/1a1a1a/ffffff.png?text=No+Cover';
        
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: Array.isArray(currentTrack.artist)
            ? currentTrack.artist.join(", ")
            : currentTrack.artist,
          album: import.meta.env.VITE_APP_HEADER || "MNR Talk",
          artwork: [
            { src: coverArtUrl, sizes: "96x96", type: "image/png" },
            { src: coverArtUrl, sizes: "128x128", type: "image/png" },
            { src: coverArtUrl, sizes: "192x192", type: "image/png" },
            { src: coverArtUrl, sizes: "256x256", type: "image/png" },
            { src: coverArtUrl, sizes: "384x384", type: "image/png" },
            { src: coverArtUrl, sizes: "512x512", type: "image/png" },
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
    loadListeningHistory,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} />
    </PlayerContext.Provider>
  );
};

    

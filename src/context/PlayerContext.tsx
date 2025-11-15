
"use client";

import type { Podcast } from "@/lib/podcasts";
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { usePodcast } from "./PodcastContext";

interface PlayerContextType {
  currentTrack: Podcast | null;
  isPlaying: boolean;
  play: (trackId?: string) => void;
  pause: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  progress: number;
  duration: number;
  seek: (time: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isPlayingRef = React.useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const play = useCallback(
    (trackId?: string) => {
      const trackToPlay = trackId
        ? podcasts.find((p) => p.id === trackId)
        : currentTrack || podcasts[0];

      if (trackToPlay) {
        if (currentTrack?.id !== trackToPlay.id) {
          setCurrentTrack(trackToPlay);
        } else {
          // If it's the same track, just play it
          audioRef.current
            ?.play()
            .then(() => setIsPlaying(true))
            .catch((e) => console.error("Playback failed", e));
        }
      }
    },
    [podcasts, currentTrack],
  );

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      if (audioRef.current.src !== currentTrack.audioUrl) {
        audioRef.current.src = currentTrack.audioUrl;
        setProgress(0);
      }
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.error("Playback failed", e));
    }
  }, [currentTrack]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (!currentTrack && podcasts.length > 0) {
      play(podcasts[0].id);
      return;
    }

    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play, currentTrack, podcasts]);

  const findCurrentTrackIndex = useCallback(
    () => (currentTrack ? podcasts.findIndex((p) => p.id === currentTrack.id) : -1),
    [currentTrack, podcasts],
  );

  const nextTrack = useCallback(() => {
    if (!podcasts.length) return;
    const currentIndex = findCurrentTrackIndex();
    const nextIndex = (currentIndex + 1) % podcasts.length;
    play(podcasts[nextIndex].id);
  }, [podcasts, play, findCurrentTrackIndex]);

  const prevTrack = useCallback(() => {
    if (!podcasts.length) return;
    const currentIndex = findCurrentTrackIndex();
    const prevIndex = (currentIndex - 1 + podcasts.length) % podcasts.length;
    play(podcasts[prevIndex].id);
  }, [podcasts, play, findCurrentTrackIndex]);

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

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

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
  }, [nextTrack]);

  const value = {
    currentTrack,
    isPlaying,
    play,
    pause,
    togglePlay,
    nextTrack,
    prevTrack,
    audioRef,
    progress,
    duration,
    seek,
    volume,
    setVolume,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} />
    </PlayerContext.Provider>
  );
};

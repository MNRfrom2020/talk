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

interface PlayerContextType {
  playlist: Podcast[];
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
  addPodcast: (podcast: Omit<Podcast, "id">) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};

export const PlayerProvider = ({
  children,
  initialPodcasts,
}: {
  children: React.ReactNode;
  initialPodcasts: Podcast[];
}) => {
  const [playlist, setPlaylist] = useState<Podcast[]>(initialPodcasts);
  const [currentTrack, setCurrentTrack] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const addPodcast = (podcast: Omit<Podcast, "id">) => {
    const newPodcast: Podcast = {
      ...podcast,
      id: (playlist.length + 1).toString(),
    };
    setPlaylist((prev) => [newPodcast, ...prev]);
  };

  const play = useCallback(
    (trackId?: string) => {
      const trackToPlay = trackId
        ? playlist.find((p) => p.id === trackId)
        : currentTrack || playlist[0];
      if (trackToPlay) {
        if (currentTrack?.id !== trackToPlay.id) {
          setCurrentTrack(trackToPlay);
          if (audioRef.current) {
            audioRef.current.src = trackToPlay.audioUrl;
          }
        }
        audioRef.current
          ?.play()
          .then(() => setIsPlaying(true))
          .catch((e) => console.error("Playback failed", e));
      }
    },
    [playlist, currentTrack],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (!currentTrack && playlist.length > 0) {
      play(playlist[0].id);
      return;
    }

    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play, currentTrack, playlist]);

  const findCurrentTrackIndex = () =>
    currentTrack ? playlist.findIndex((p) => p.id === currentTrack.id) : -1;

  const nextTrack = useCallback(() => {
    if (!playlist.length) return;
    const currentIndex = findCurrentTrackIndex();
    const nextIndex = (currentIndex + 1) % playlist.length;
    play(playlist[nextIndex].id);
  }, [playlist, play, findCurrentTrackIndex]);

  const prevTrack = useCallback(() => {
    if (!playlist.length) return;
    const currentIndex = findCurrentTrackIndex();
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    play(playlist[prevIndex].id);
  }, [playlist, play, findCurrentTrackIndex]);

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
    setProgress(audioRef.current?.currentTime || 0);
  };

  const onLoadedMetadata = () => {
    setDuration(audioRef.current?.duration || 0);
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
    playlist,
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
    addPodcast,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} />
    </PlayerContext.Provider>
  );
};

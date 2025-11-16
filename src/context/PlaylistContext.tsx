
"use client";

import type { Playlist, Podcast } from "@/lib/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import predefinedPlaylistsData from "@/lib/predefined-playlists.json";


const PLAYLIST_STORAGE_KEY = "podcast_playlists";
const FAVORITES_PLAYLIST_ID = 'favorites';


interface PlaylistContextType {
  playlists: Playlist[];
  createPlaylist: (name: string) => void;
  deletePlaylist: (playlistId: string) => void;
  addPodcastToPlaylist: (playlistId: string, podcastId: string) => void;
  getPodcastsForPlaylist: (
    playlistId: string,
    allPodcasts: Podcast[],
  ) => Podcast[];
  getPlaylistById: (playlistId: string) => Playlist | undefined;
  toggleFavorite: (playlistId: string) => void;
  toggleFavoritePodcast: (podcastId: string) => void;
  isFavoritePodcast: (podcastId: string) => boolean;
  FAVORITES_PLAYLIST_ID: string;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(
  undefined,
);

export const usePlaylist = () => {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error("usePlaylist must be used within a PlaylistProvider");
  }
  return context;
};

export const PlaylistProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    try {
      const storedPlaylists = localStorage.getItem(PLAYLIST_STORAGE_KEY);
      const userPlaylists = storedPlaylists ? JSON.parse(storedPlaylists) : [];
      const predefinedPlaylists: Playlist[] = predefinedPlaylistsData.map(p => ({...p, isPredefined: true}));
      
      // Merge favorites from userPlaylists into predefinedPlaylists
      const enrichedPredefined = predefinedPlaylists.map(p => {
        const userVersion = userPlaylists.find((up: Playlist) => up.id === p.id);
        return userVersion ? { ...p, isFavorite: userVersion.isFavorite } : p;
      });
      
      const userOnlyPlaylists = userPlaylists.filter((p: Playlist) => !predefinedPlaylists.some(pre => pre.id === p.id));

      setPlaylists([...enrichedPredefined, ...userOnlyPlaylists]);
    } catch (error) {
      console.error("Failed to load playlists from localStorage", error);
      const predefinedPlaylists: Playlist[] = predefinedPlaylistsData.map(p => ({...p, isPredefined: true}));
      setPlaylists(predefinedPlaylists);
    }
  }, []);

  const savePlaylists = (updatedPlaylists: Playlist[]) => {
    try {
      // We only save user-created playlists and favorite status of predefined ones
      const playlistsToSave = updatedPlaylists.map(p => {
        if (p.isPredefined) {
          return { id: p.id, isFavorite: p.isFavorite };
        }
        return p;
      });
      localStorage.setItem(
        PLAYLIST_STORAGE_KEY,
        JSON.stringify(playlistsToSave.filter(p => !p.isPredefined || p.isFavorite)),
      );
      setPlaylists(updatedPlaylists);
    } catch (error) {
      console.error("Failed to save playlists to localStorage", error);
    }
  };

  const createPlaylist = useCallback(
    (name: string) => {
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name,
        podcastIds: [],
        isPredefined: false,
        isFavorite: false,
      };
      const updatedPlaylists = [...playlists, newPlaylist];
      savePlaylists(updatedPlaylists);
    },
    [playlists],
  );

    const deletePlaylist = useCallback(
    (playlistId: string) => {
      if (playlistId === FAVORITES_PLAYLIST_ID) return; // Cannot delete favorites playlist
      const updatedPlaylists = playlists.filter(
        (playlist) => playlist.id !== playlistId
      );
      savePlaylists(updatedPlaylists);
    },
    [playlists],
  );

  const addPodcastToPlaylist = useCallback(
    (playlistId: string, podcastId: string) => {
      const updatedPlaylists = playlists.map((playlist) => {
        if (playlist.id === playlistId && !playlist.isPredefined) {
          // Avoid adding duplicates
          if (!playlist.podcastIds.includes(podcastId)) {
            return { ...playlist, podcastIds: [...playlist.podcastIds, podcastId] };
          }
        }
        return playlist;
      });
      savePlaylists(updatedPlaylists);
    },
    [playlists],
  );

  const getPodcastsForPlaylist = useCallback(
    (playlistId: string, allPodcasts: Podcast[]) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist) return [];
      return playlist.podcastIds
        .map((id) => allPodcasts.find((p) => p.id === id))
        .filter((p): p is Podcast => !!p);
    },
    [playlists],
  );

  const getPlaylistById = useCallback(
    (playlistId: string) => {
      return playlists.find((p) => p.id === playlistId);
    },
    [playlists],
  );

  const toggleFavorite = useCallback(
    (playlistId: string) => {
       const updatedPlaylists = playlists.map((playlist) => {
        if (playlist.id === playlistId) {
          return { ...playlist, isFavorite: !playlist.isFavorite };
        }
        return playlist;
      });
      savePlaylists(updatedPlaylists);
    },
    [playlists]
  );

  const isFavoritePodcast = useCallback(
    (podcastId: string) => {
      const favoritesPlaylist = playlists.find(p => p.id === FAVORITES_PLAYLIST_ID);
      return favoritesPlaylist?.podcastIds.includes(podcastId) ?? false;
    },
    [playlists],
  );


  const toggleFavoritePodcast = useCallback(
    (podcastId: string) => {
      let favoritesPlaylist = playlists.find(p => p.id === FAVORITES_PLAYLIST_ID);
      let updatedPlaylists;

      if (favoritesPlaylist) {
        const isAlreadyFavorite = favoritesPlaylist.podcastIds.includes(podcastId);
        updatedPlaylists = playlists.map(p => {
          if (p.id === FAVORITES_PLAYLIST_ID) {
            return {
              ...p,
              podcastIds: isAlreadyFavorite
                ? p.podcastIds.filter(id => id !== podcastId)
                : [...p.podcastIds, podcastId],
            };
          }
          return p;
        });
      } else {
        // Create the favorites playlist if it doesn't exist
        const newFavoritesPlaylist: Playlist = {
          id: FAVORITES_PLAYLIST_ID,
          name: "Favorites",
          podcastIds: [podcastId],
          isPredefined: false, // Treat as a user playlist, but with special ID
          isFavorite: false,
        };
        updatedPlaylists = [...playlists, newFavoritesPlaylist];
      }
      
      savePlaylists(updatedPlaylists);
    },
    [playlists],
  );


  const value = {
    playlists,
    createPlaylist,
    deletePlaylist,
    addPodcastToPlaylist,
    getPodcastsForPlaylist,
    getPlaylistById,
    toggleFavorite,
    toggleFavoritePodcast,
    isFavoritePodcast,
    FAVORITES_PLAYLIST_ID,
  };

  return (
    <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>
  );
};

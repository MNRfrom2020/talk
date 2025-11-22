
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
export const FAVORITES_PLAYLIST_ID = 'favorites';


interface PlaylistContextType {
  playlists: Playlist[];
  createPlaylist: (name: string, podcastIds?: string[]) => void;
  deletePlaylist: (playlistId: string) => void;
  addPodcastToPlaylist: (playlistId: string, podcastId: string) => void;
  removePodcastFromPlaylist: (playlistId: string, podcastId: string) => void;
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
      const userPlaylistsFromStorage = storedPlaylists ? JSON.parse(storedPlaylists) : [];
      const predefinedPlaylists: Playlist[] = predefinedPlaylistsData.map(p => ({...p, isPredefined: true, isFavorite: false}));

      const combinedPlaylists: Playlist[] = [];
      const seenIds = new Set<string>();

      // Add predefined playlists, potentially updated from storage
      predefinedPlaylists.forEach(pdef => {
        const storedVersion = userPlaylistsFromStorage.find((p: Playlist) => p.id === pdef.id);
        if (storedVersion && storedVersion.isFavorite) {
          // If stored and favorited, use the stored version (which is a full copy)
          combinedPlaylists.push({ ...pdef, ...storedVersion, isPredefined: true });
        } else {
           // Otherwise, use the one from JSON
          combinedPlaylists.push(pdef);
        }
        seenIds.add(pdef.id);
      });
      
      // Add user-created playlists from storage that aren't predefined
      const userOnlyPlaylists = userPlaylistsFromStorage.filter((p: Playlist) => !seenIds.has(p.id));
      combinedPlaylists.push(...userOnlyPlaylists);

      // Ensure Favorites playlist always exists
      let favoritesPlaylist = combinedPlaylists.find((p: Playlist) => p.id === FAVORITES_PLAYLIST_ID);
      if (!favoritesPlaylist) {
        favoritesPlaylist = {
          id: FAVORITES_PLAYLIST_ID,
          name: "Favorites",
          podcastIds: [],
          isPredefined: false,
          isFavorite: false,
        };
        combinedPlaylists.unshift(favoritesPlaylist);
      }
      
      setPlaylists(combinedPlaylists);

    } catch (error) {
      console.error("Failed to load playlists from localStorage", error);
       const predefinedPlaylists: Playlist[] = predefinedPlaylistsData.map(p => ({...p, isPredefined: true}));
       const favoritesPlaylist: Playlist = {
        id: FAVORITES_PLAYLIST_ID,
        name: "Favorites",
        podcastIds: [],
        isPredefined: false,
        isFavorite: false,
      };
      setPlaylists([...predefinedPlaylists, favoritesPlaylist]);
    }
  }, []);

  const savePlaylists = (updatedPlaylists: Playlist[]) => {
    try {
      // Filter out non-favorited predefined playlists before saving
      const playlistsToSave = updatedPlaylists.filter(p => !p.isPredefined || p.isFavorite).map(p => {
        if (p.isPredefined) {
          // For predefined, only save id and isFavorite status
          return { id: p.id, isFavorite: p.isFavorite };
        }
        // For user-created, save everything
        return p;
      });
      
      localStorage.setItem(
        PLAYLIST_STORAGE_KEY,
        JSON.stringify(playlistsToSave),
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
      const playlistToDelete = playlists.find(p => p.id === playlistId);
      
      if (playlistToDelete && playlistToDelete.isPredefined) {
        // If it's a predefined playlist, just unfavorite it instead of deleting
        toggleFavorite(playlistId);
      } else {
        const updatedPlaylists = playlists.filter(
          (playlist) => playlist.id !== playlistId
        );
        savePlaylists(updatedPlaylists);
      }
    },
    [playlists],
  );

  const addPodcastToPlaylist = useCallback(
    (playlistId: string, podcastId: string) => {
      const updatedPlaylists = playlists.map((playlist) => {
        if (playlist.id === playlistId && !playlist.isPredefined) {
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

  const removePodcastFromPlaylist = useCallback(
    (playlistId: string, podcastId: string) => {
      const updatedPlaylists = playlists.map((playlist) => {
        if (playlist.id === playlistId && !playlist.isPredefined) {
          return {
            ...playlist,
            podcastIds: playlist.podcastIds.filter((id) => id !== podcastId),
          };
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
      
      const podcastIdSet = new Set(allPodcasts.map(p => p.id));
      const validPodcastIds = playlist.podcastIds.filter(id => podcastIdSet.has(id));

      return validPodcastIds
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
          // When favoriting a predefined playlist, create a full copy
          if (playlist.isPredefined && !playlist.isFavorite) {
            return { ...playlist, isFavorite: true };
          }
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
        const newFavoritesPlaylist: Playlist = {
          id: FAVORITES_PLAYLIST_ID,
          name: "Favorites",
          podcastIds: [podcastId],
          isPredefined: false, 
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
    removePodcastFromPlaylist,
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

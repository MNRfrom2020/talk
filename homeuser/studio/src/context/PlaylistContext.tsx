
"use client";

import type { Playlist, Podcast } from "@/lib/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useUser } from "./UserContext";
import { supabase } from "@/lib/supabase";
import { savePlaylist as savePlaylistAction, deletePlaylist as deletePlaylistAction } from "@/lib/actions";


const PLAYLIST_STORAGE_KEY = "podcast_playlists_guest";
const FAVORITES_PLAYLIST_NAME = "Favorites";


interface PlaylistContextType {
  playlists: Playlist[];
  createPlaylist: (name: string, podcastIds?: string[]) => void;
  deletePlaylist: (playlistId: string) => void;
  addPodcastToGuestPlaylist: (playlistId: string, podcastId: string) => void;
  removePodcastFromGuestPlaylist: (playlistId: string, podcastId: string) => void;
  addPodcastToUserPlaylist: (playlistId: string, podcastId: string) => Promise<void>;
  removePodcastFromUserPlaylist: (playlistId: string, podcastId: string) => Promise<void>;
  getPodcastsForPlaylist: (
    playlistId: string,
    allPodcasts: Podcast[],
  ) => Podcast[];
  getPlaylistById: (playlistId: string) => Playlist | undefined;
  toggleFavorite: (playlistId: string) => void;
  toggleFavoritePodcast: (podcastId: string) => void;
  isFavoritePodcast: (podcastId: string) => boolean;
  FAVORITES_PLAYLIST_ID: string | undefined;
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
  const { user } = useUser();
  const [FAVORITES_PLAYLIST_ID, setFavoritesPlaylistId] = useState<string | undefined>();

  useEffect(() => {
    const loadPlaylists = async () => {
      // Fetch predefined playlists from the 'playlists' table
      const { data: predefinedPlaylistsDb, error: predefinedError } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (predefinedError) {
        console.error("Failed to fetch predefined playlists:", predefinedError);
      }

      const predefinedPlaylists: Playlist[] = (predefinedPlaylistsDb || []).map(p => ({
        ...p,
        isPredefined: true,
      }));


      if (user.isGuest) {
        // --- GUEST USER ---
        try {
          const storedPlaylists = localStorage.getItem(PLAYLIST_STORAGE_KEY);
          const userPlaylists = storedPlaylists ? JSON.parse(storedPlaylists) : [];
          
          const enrichedPredefined = predefinedPlaylists.map(p => {
            const userVersion = userPlaylists.find((up: Playlist) => up.id === p.id);
            return userVersion ? { ...p, isFavorite: userVersion.isFavorite } : p;
          });

          let userOnlyPlaylists = userPlaylists.filter((p: Playlist) => !predefinedPlaylists.some(pre => pre.id === p.id));
          
          let favoritesPlaylist = userOnlyPlaylists.find((p: Playlist) => p.name === FAVORITES_PLAYLIST_NAME);
          if (!favoritesPlaylist) {
            favoritesPlaylist = { id: 'favorites-guest', name: FAVORITES_PLAYLIST_NAME, podcast_ids: [], isPredefined: false, isFavorite: false, created_at: new Date().toISOString(), cover: null };
            userOnlyPlaylists.unshift(favoritesPlaylist);
          }
          setFavoritesPlaylistId(favoritesPlaylist.id);

          setPlaylists([...enrichedPredefined, ...userOnlyPlaylists]);

        } catch (error) {
          console.error("Failed to load guest playlists from localStorage", error);
          setPlaylists(predefinedPlaylists);
        }
      } else {
        // --- LOGGED-IN USER ---
        if (!user.uid) {
          setPlaylists(predefinedPlaylists);
          return;
        }

        const { data: userPlaylistsDb, error } = await supabase
          .from('user_playlists')
          .select('*')
          .eq('user_uid', user.uid);
        
        if (error) {
          console.error("Failed to fetch user playlists:", error);
          setPlaylists(predefinedPlaylists); // Fallback to predefined
          return;
        }
        
        const userPlaylists = userPlaylistsDb || [];
        
        const favPlaylist = userPlaylists.find(p => p.name === FAVORITES_PLAYLIST_NAME);
        if (favPlaylist) {
            setFavoritesPlaylistId(favPlaylist.id);
        }
        
        setPlaylists([...predefinedPlaylists, ...userPlaylists]);
      }
    };

    loadPlaylists();
  }, [user]);

  const savePlaylistsForGuest = (updatedPlaylists: Playlist[]) => {
      try {
        const playlistsToSave = updatedPlaylists.map(p => {
          // For predefined, only save favorite status
          if (p.isPredefined) {
            if (p.isFavorite) {
              return { id: p.id, isFavorite: true };
            }
            return null;
          }
          // For user-created, save all details
          return { id: p.id, name: p.name, podcast_ids: p.podcast_ids, isFavorite: p.isFavorite, created_at: p.created_at, cover: p.cover };
        }).filter(Boolean);

        localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlistsToSave));
      } catch (error) {
        console.error("Failed to save guest playlists to localStorage", error);
      }
      setPlaylists(updatedPlaylists);
  };

  const createPlaylist = useCallback(
    async (name: string, podcastIds: string[] = []) => {
      if (name === FAVORITES_PLAYLIST_NAME) return;

      if (user.isGuest) {
        const newPlaylist: Playlist = {
          id: Date.now().toString(),
          name,
          podcast_ids: podcastIds,
          isPredefined: false,
          isFavorite: false,
          created_at: new Date().toISOString(),
          cover: null,
        };
        const updatedPlaylists = [...playlists, newPlaylist];
        savePlaylistsForGuest(updatedPlaylists);
      } else {
         if (!user.uid) return;
         const { data, error } = await supabase
          .from("user_playlists")
          .insert({ name, podcast_ids: podcastIds, user_uid: user.uid })
          .select()
          .single();
        
        if (data && !error) {
            setPlaylists(prev => [...prev, data]);
        } else {
             console.error("Error creating playlist:", error?.message);
        }
      }
    },
    [playlists, user],
  );

  const deletePlaylist = useCallback(
    async (playlistId: string) => {
      const playlistToDelete = playlists.find(p => p.id === playlistId);
      if (!playlistToDelete || playlistToDelete.isPredefined || playlistToDelete.name === FAVORITES_PLAYLIST_NAME) return;

      if (user.isGuest) {
        const updatedPlaylists = playlists.filter(
          (playlist) => playlist.id !== playlistId
        );
        savePlaylistsForGuest(updatedPlaylists);
      } else {
        const { error } = await supabase.from('user_playlists').delete().eq('id', playlistId);
        if (!error) {
            setPlaylists(prev => prev.filter(p => p.id !== playlistId));
        } else {
            console.error("Error deleting playlist:", error.message);
        }
      }
    },
    [playlists, user],
  );

  const addPodcastToGuestPlaylist = (playlistId: string, podcastId: string) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist || playlist.isPredefined) return;

      if (!playlist.podcast_ids.includes(podcastId)) {
        const newPodcastIds = [...playlist.podcast_ids, podcastId];
        const updatedPlaylists = playlists.map((p) =>
            p.id === playlistId ? { ...p, podcast_ids: newPodcastIds } : p
        );
        savePlaylistsForGuest(updatedPlaylists);
      }
  };

  const addPodcastToUserPlaylist = async (playlistId: string, podcastId: string) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist || playlist.isPredefined || !user.uid || playlist.podcast_ids.includes(podcastId)) return;
      
      const newPodcastIds = [...playlist.podcast_ids, podcastId];
      const { error } = await supabase
        .from('user_playlists')
        .update({ podcast_ids: newPodcastIds })
        .eq('id', playlistId)
        .eq('user_uid', user.uid);
      
      if (!error) {
          setPlaylists(prev => prev.map(p => p.id === playlistId ? {...p, podcast_ids: newPodcastIds} : p));
      } else {
          console.error("Error adding podcast to user playlist:", error.message);
      }
  };

  const removePodcastFromGuestPlaylist = (playlistId: string, podcastId: string) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist || playlist.isPredefined) return;
      
      const newPodcastIds = playlist.podcast_ids.filter((id) => id !== podcastId);
      const updatedPlaylists = playlists.map((p) =>
          p.id === playlistId ? { ...p, podcast_ids: newPodcastIds } : p
      );
      savePlaylistsForGuest(updatedPlaylists);
  };

  const removePodcastFromUserPlaylist = async (playlistId: string, podcastId: string) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist || playlist.isPredefined || !user.uid) return;
      
      const newPodcastIds = playlist.podcast_ids.filter((id) => id !== podcastId);
      const { error } = await supabase
        .from('user_playlists')
        .update({ podcast_ids: newPodcastIds })
        .eq('id', playlistId)
        .eq('user_uid', user.uid);
      
      if (!error) {
          setPlaylists(prev => prev.map(p => p.id === playlistId ? {...p, podcast_ids: newPodcastIds} : p));
      } else {
          console.error("Error removing podcast from user playlist:", error.message);
      }
  };

  const getPodcastsForPlaylist = useCallback(
    (playlistId: string, allPodcasts: Podcast[]) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist || !playlist.podcast_ids) return [];
      return playlist.podcast_ids
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
    async (playlistId: string) => {
       const playlist = playlists.find(p => p.id === playlistId);
       if (!playlist || !playlist.isPredefined) return;
       
       const updatedPlaylist = { ...playlist, isFavorite: !playlist.isFavorite };

       if (user.isGuest) {
          const updatedPlaylists = playlists.map(p => p.id === playlistId ? updatedPlaylist : p);
          savePlaylistsForGuest(updatedPlaylists);
       } else {
          if(!user.uid) return;
          // This state is ephemeral for logged-in users and not saved in the DB for predefined playlists.
          setPlaylists(playlists.map(p => p.id === playlistId ? updatedPlaylist : p));
       }
    },
    [playlists, user]
  );

  const isFavoritePodcast = useCallback(
    (podcastId: string) => {
      const favoritesPlaylist = playlists.find(
        (p) => p.id === FAVORITES_PLAYLIST_ID
      );
      return favoritesPlaylist?.podcast_ids?.includes(podcastId) ?? false;
    },
    [playlists, FAVORITES_PLAYLIST_ID],
  );


  const toggleFavoritePodcast = useCallback(
    (podcastId: string) => {
      if (FAVORITES_PLAYLIST_ID) {
          const isAlreadyFavorite = isFavoritePodcast(podcastId);
          if (user.isGuest) {
             if (isAlreadyFavorite) {
              removePodcastFromGuestPlaylist(FAVORITES_PLAYLIST_ID, podcastId);
            } else {
              addPodcastToGuestPlaylist(FAVORITES_PLAYLIST_ID, podcastId);
            }
          } else {
             if (isAlreadyFavorite) {
              removePodcastFromUserPlaylist(FAVORITES_PLAYLIST_ID, podcastId);
            } else {
              addPodcastToUserPlaylist(FAVORITES_PLAYLIST_ID, podcastId);
            }
          }
      } else {
        console.error("Favorites playlist ID not found");
      }
    },
    [FAVORITES_PLAYLIST_ID, isFavoritePodcast, user.isGuest, addPodcastToGuestPlaylist, removePodcastFromGuestPlaylist, addPodcastToUserPlaylist, removePodcastFromUserPlaylist],
  );


  const value = {
    playlists,
    createPlaylist,
    deletePlaylist,
    addPodcastToGuestPlaylist,
    removePodcastFromGuestPlaylist,
    addPodcastToUserPlaylist,
    removePodcastFromUserPlaylist,
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

    
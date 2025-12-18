
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
import { saveUserPlaylist, deletePlaylist as deletePlaylistAction } from "@/lib/actions";


const PLAYLIST_STORAGE_KEY = "podcast_playlists_guest";
const FAVORITES_PLAYLIST_NAME = "Favorites";
const GUEST_FAVORITES_PLAYLIST_ID = "favorites-guest";


interface PlaylistContextType {
  playlists: Playlist[];
  createPlaylist: (name: string, podcastIds?: string[], cover?: string | null) => void;
  updatePlaylist: (playlistId: string, data: { name?: string, cover?: string | null }) => Promise<void>;
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
  const { user, toggleFavoritePlaylist: toggleFavoritePlaylistInUser } = useUser();
  const [FAVORITES_PLAYLIST_ID, setFavoritesPlaylistId] = useState<string | undefined>();

  useEffect(() => {
    const loadPlaylists = async () => {
      const { data: predefinedPlaylistsDb, error: predefinedError } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (predefinedError) {
        console.error("Failed to fetch predefined playlists:", predefinedError);
      }

      let predefinedPlaylists: Playlist[] = (predefinedPlaylistsDb || []).map(p => ({
        ...p,
        isPredefined: true,
      }));


      if (user.isGuest) {
        try {
          const storedPlaylists = localStorage.getItem(PLAYLIST_STORAGE_KEY);
          const guestPlaylists = storedPlaylists ? JSON.parse(storedPlaylists) : [];
          
          const guestFavoriteIds = guestPlaylists
            .filter((p: { isFavorite?: boolean }) => p.isFavorite)
            .map((p: { id: string }) => p.id);
          
          predefinedPlaylists = predefinedPlaylists.map(p => ({
            ...p,
            isFavorite: guestFavoriteIds.includes(p.id),
          }));

          let userOnlyPlaylists = guestPlaylists.filter((p: Playlist) => !predefinedPlaylists.some(pre => pre.id === p.id));
          
          let favoritesPlaylist = userOnlyPlaylists.find((p: Playlist) => p.name === FAVORITES_PLAYLIST_NAME);
          if (!favoritesPlaylist) {
            favoritesPlaylist = { id: GUEST_FAVORITES_PLAYLIST_ID, name: FAVORITES_PLAYLIST_NAME, podcast_ids: [], isPredefined: false, isFavorite: false, created_at: new Date().toISOString(), cover: null };
            userOnlyPlaylists.unshift(favoritesPlaylist);
          }
          setFavoritesPlaylistId(favoritesPlaylist.id);

          setPlaylists([...predefinedPlaylists, ...userOnlyPlaylists]);

        } catch (error) {
          console.error("Failed to load guest playlists from localStorage", error);
          setPlaylists(predefinedPlaylists);
        }
      } else {
        // --- LOGGED-IN USER ---
        predefinedPlaylists = predefinedPlaylists.map(p => ({
          ...p,
          isFavorite: user.playlists_ids?.includes(p.id),
        }));

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
          setPlaylists(predefinedPlaylists);
          return;
        }
        
        const userPlaylists = userPlaylistsDb || [];
        
        let favPlaylist = userPlaylists.find(p => p.name === FAVORITES_PLAYLIST_NAME);
        if (favPlaylist) {
            setFavoritesPlaylistId(favPlaylist.id);
        } else {
          // If for some reason a logged in user doesn't have a favorites playlist, create one virtually for the session.
           const { data: newPlaylist, error: createError } = await supabase
            .from('user_playlists')
            .insert({ user_uid: user.uid, name: FAVORITES_PLAYLIST_NAME, podcast_ids: [] })
            .select()
            .single();

            if (createError) {
              console.error("Could not create favorites playlist for user:", createError);
            } else if (newPlaylist) {
              userPlaylists.push(newPlaylist);
              setFavoritesPlaylistId(newPlaylist.id);
            }
        }
        
        setPlaylists([...predefinedPlaylists, ...userPlaylists]);
      }
    };

    if (!user.loading) {
       loadPlaylists();
    }
  }, [user]);

  const savePlaylistsForGuest = (updatedPlaylists: Playlist[]) => {
      try {
        const guestPlaylists = updatedPlaylists.filter(p => !p.isPredefined);
        const predefinedFavorites = updatedPlaylists
          .filter(p => p.isPredefined && p.isFavorite)
          .map(p => ({ id: p.id, isFavorite: true }));
        
        const dataToSave = [...guestPlaylists, ...predefinedFavorites];
        
        localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (error) {
        console.error("Failed to save guest playlists to localStorage", error);
      }
      setPlaylists(updatedPlaylists);
  };

  const createPlaylist = useCallback(
    async (name: string, podcastIds: string[] = [], cover: string | null = null) => {
      if (name === FAVORITES_PLAYLIST_NAME) return;

      if (user.isGuest) {
        const newPlaylist: Playlist = {
          id: Date.now().toString(),
          name,
          podcast_ids: podcastIds,
          isPredefined: false,
          isFavorite: false,
          created_at: new Date().toISOString(),
          cover: cover,
        };
        const updatedPlaylists = [...playlists, newPlaylist];
        savePlaylistsForGuest(updatedPlaylists);
      } else {
         if (!user.uid) return;
         const result = await saveUserPlaylist({
            name,
            podcast_ids: podcastIds,
            cover: cover || null,
            user_uid: user.uid,
         });

        if (result.message && !result.errors) {
            const { data: newPlaylist, error } = await supabase.from('user_playlists').select().eq('name', name).eq('user_uid', user.uid).order('created_at', { ascending: false }).limit(1).single();
            if (newPlaylist && !error) {
                 setPlaylists(prev => [...prev, newPlaylist]);
            }
        } else {
             console.error("Error creating playlist:", result.message);
        }
      }
    },
    [playlists, user],
  );

  const updatePlaylist = useCallback(
    async (playlistId: string, data: { name?: string, cover?: string | null }) => {
        const playlistToUpdate = playlists.find(p => p.id === playlistId);
        if (!playlistToUpdate || playlistToUpdate.isPredefined) {
            throw new Error("Cannot update this playlist.");
        }

        if (user.isGuest) {
            const updatedPlaylists = playlists.map(p => 
                p.id === playlistId ? { ...p, ...data, cover: data.cover || null } : p
            );
            savePlaylistsForGuest(updatedPlaylists);
        } else {
            if (!user.uid) throw new Error("User not logged in.");
            const result = await saveUserPlaylist({
                id: playlistId,
                user_uid: user.uid,
                name: data.name,
                cover: data.cover,
            });

            if (result.errors) {
                throw new Error(result.message || "Could not update playlist.");
            }
            
            setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, ...data, cover: data.cover || null } : p));
        }
    }, [playlists, user]);

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
        const result = await deletePlaylistAction(playlistId, true); // Always a user playlist
        if (result.message && !result.message.includes("Error")) {
            setPlaylists(prev => prev.filter(p => p.id !== playlistId));
        } else {
            console.error("Error deleting playlist:", result.message);
        }
      }
    },
    [playlists, user],
  );

  const addPodcastToGuestPlaylist = (playlistId: string, podcastId: string) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist || playlist.isPredefined || playlist.podcast_ids.includes(podcastId)) return;

      const newPodcastIds = [...playlist.podcast_ids, podcastId];
      const updatedPlaylists = playlists.map((p) =>
          p.id === playlistId ? { ...p, podcast_ids: newPodcastIds } : p
      );
      savePlaylistsForGuest(updatedPlaylists);
  };

  const addPodcastToUserPlaylist = async (playlistId: string, podcastId: string) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist || !user.uid || playlist.podcast_ids.includes(podcastId)) return;
      
      const newPodcastIds = [...playlist.podcast_ids, podcastId];
      
      const result = await saveUserPlaylist({
        id: playlist.id,
        user_uid: user.uid,
        podcast_ids: newPodcastIds,
        name: playlist.name, // Pass name to satisfy validation
      });

      if (result.errors) {
          throw new Error(result.message || "Could not add podcast to playlist.");
      }
      
      setPlaylists(prev => prev.map(p => p.id === playlistId ? {...p, podcast_ids: newPodcastIds} : p));
  };

  const removePodcastFromGuestPlaylist = (playlistId: string, podcastId: string) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist) return;
      
      const newPodcastIds = playlist.podcast_ids.filter((id) => id !== podcastId);
      const updatedPlaylists = playlists.map((p) =>
          p.id === playlistId ? { ...p, podcast_ids: newPodcastIds } : p
      );
      savePlaylistsForGuest(updatedPlaylists);
  };

  const removePodcastFromUserPlaylist = async (playlistId: string, podcastId: string) => {
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist || !user.uid) {
        return Promise.reject(new Error("Playlist not found or user not authorized."));
    }
    
    const newPodcastIds = playlist.podcast_ids.filter((id) => id !== podcastId);

    const result = await saveUserPlaylist({
      id: playlist.id,
      user_uid: user.uid,
      podcast_ids: newPodcastIds,
      name: playlist.name, // Pass name to satisfy validation
    });
    
    if (result.errors) {
        throw new Error(result.message || "Could not remove podcast from playlist.");
    }
    
    setPlaylists(prev => prev.map(p => p.id === playlistId ? {...p, podcast_ids: newPodcastIds} : p));
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
       
       if (user.isGuest) {
          const updatedPlaylist = { ...playlist, isFavorite: !playlist.isFavorite };
          const updatedPlaylists = playlists.map(p => p.id === playlistId ? updatedPlaylist : p);
          savePlaylistsForGuest(updatedPlaylists);
       } else {
          if(!user.uid) return;
          toggleFavoritePlaylistInUser(playlistId);
       }
    },
    [playlists, user, toggleFavoritePlaylistInUser]
  );

  const isFavoritePodcast = useCallback(
    (podcastId: string) => {
      if (!FAVORITES_PLAYLIST_ID) return false;
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
    updatePlaylist,
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

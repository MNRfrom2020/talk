
"use client";

import type { Playlist, Podcast } from "@/lib/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import initialPlaylistsData from "@/lib/playlist.json";
import { useUser } from "./UserContext";
import { supabase } from "@/lib/supabase";
import { savePlaylist as savePlaylistAction, deletePlaylist as deletePlaylistAction } from "@/lib/actions";


const PLAYLIST_STORAGE_KEY = "podcast_playlists_guest";
export const FAVORITES_PLAYLIST_NAME = "Favorites";


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
      const predefinedPlaylists: Playlist[] = (initialPlaylistsData as any[]).map(p => ({
        ...p, 
        podcast_ids: p.podcastIds,
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
            favoritesPlaylist = { id: 'favorites-guest', name: FAVORITES_PLAYLIST_NAME, podcast_ids: [], isPredefined: false, isFavorite: false };
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

        let favoritesPlaylist = userPlaylists.find(p => p.name === FAVORITES_PLAYLIST_NAME);
         if (!favoritesPlaylist) {
            const { data: newFav, error: newFavError } = await supabase.from('user_playlists').insert({
                name: FAVORITES_PLAYLIST_NAME, 
                podcast_ids: [],
                user_uid: user.uid
            }).select().single();

            if (newFavError) {
              console.error("Failed to create Favorites playlist for user:", newFavError);
            } else if (newFav) {
              favoritesPlaylist = newFav;
              userPlaylists.push(newFav);
            }
        }
        if (favoritesPlaylist) {
          setFavoritesPlaylistId(favoritesPlaylist.id);
        }
        
        setPlaylists([...predefinedPlaylists, ...userPlaylists]);
      }
    };

    loadPlaylists();
  }, [user]);

  const savePlaylistsForGuest = (updatedPlaylists: Playlist[]) => {
      try {
        const playlistsToSave = updatedPlaylists.map(p => {
          if (p.isPredefined) {
            if (p.isFavorite) {
              return { id: p.id, isFavorite: true };
            }
            return null;
          }
          return { id: p.id, name: p.name, podcast_ids: p.podcast_ids, isFavorite: p.isFavorite };
        }).filter(Boolean);

        localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlistsToSave));
      } catch (error) {
        console.error("Failed to save guest playlists to localStorage", error);
      }
      setPlaylists(updatedPlaylists);
  };

  const createPlaylist = useCallback(
    async (name: string, podcastIds: string[] = []) => {
      if (name === FAVORITES_PLAYLIST_NAME) return; // Prevent creating another "Favorites"

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
         const result = await savePlaylistAction({
            name,
            podcast_ids: podcastIds,
            user_uid: user.uid
         });

        if (result.message && !result.errors) {
            const { data: newPlaylist, error } = await supabase.from('user_playlists').select().eq('name', name).eq('user_uid', user.uid).single();
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

  const deletePlaylist = useCallback(
    async (playlistId: string) => {
      const playlistToDelete = playlists.find(p => p.id === playlistId);
      if (!playlistToDelete || playlistToDelete.name === FAVORITES_PLAYLIST_NAME) return;

      if (user.isGuest) {
        const updatedPlaylists = playlists.filter(
          (playlist) => playlist.id !== playlistId
        );
        savePlaylistsForGuest(updatedPlaylists);
      } else {
        const result = await deletePlaylistAction(playlistId);
        if (result.message && !result.message.includes("Error")) {
            setPlaylists(prev => prev.filter(p => p.id !== playlistId));
        } else {
            console.error("Error deleting playlist:", result.message);
        }
      }
    },
    [playlists, user],
  );

  const addPodcastToPlaylist = useCallback(
    async (playlistId: string, podcastId: string) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist || playlist.isPredefined) return;

      if (!playlist.podcast_ids.includes(podcastId)) {
        const newPodcastIds = [...playlist.podcast_ids, podcastId];
        
        if (user.isGuest) {
          const updatedPlaylists = playlists.map((p) =>
            p.id === playlistId ? { ...p, podcast_ids: newPodcastIds } : p
          );
          savePlaylistsForGuest(updatedPlaylists);
        } else {
           if (!user.uid) return;
           const result = await savePlaylistAction({
              id: playlist.id,
              name: playlist.name,
              podcast_ids: newPodcastIds,
              cover: playlist.cover,
              created_at: playlist.created_at,
              user_uid: user.uid,
           });
          
          if (result.message && !result.errors) {
            setPlaylists(prev => prev.map(p => p.id === playlistId ? {...p, podcast_ids: newPodcastIds} : p));
          } else {
            console.error("Error adding podcast to playlist:", result.message);
          }
        }
      }
    },
    [playlists, user],
  );

  const removePodcastFromPlaylist = useCallback(
    async (playlistId: string, podcastId: string) => {
      const playlist = playlists.find((p) => p.id === playlistId);
       if (!playlist || playlist.isPredefined) return;
      
      const newPodcastIds = playlist.podcast_ids.filter((id) => id !== podcastId);

       if (user.isGuest) {
          const updatedPlaylists = playlists.map((p) =>
            p.id === playlistId ? { ...p, podcast_ids: newPodcastIds } : p
          );
          savePlaylistsForGuest(updatedPlaylists);
       } else {
          if (!user.uid) return;
           const result = await savePlaylistAction({
              id: playlist.id,
              name: playlist.name,
              podcast_ids: newPodcastIds,
              cover: playlist.cover,
              created_at: playlist.created_at,
              user_uid: user.uid,
           });
          
          if (result.message && !result.errors) {
            setPlaylists(prev => prev.map(p => p.id === playlistId ? {...p, podcast_ids: newPodcastIds} : p));
          } else {
            console.error("Error removing podcast from playlist:", result.message);
          }
       }
    },
    [playlists, user],
  );

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
          // For logged-in users, this state is ephemeral as there's no DB field for it.
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
          if (isAlreadyFavorite) {
              removePodcastFromPlaylist(FAVORITES_PLAYLIST_ID, podcastId);
          } else {
              addPodcastToPlaylist(FAVORITES_PLAYLIST_ID, podcastId);
          }
      } else {
        console.error("Favorites playlist ID not found");
      }
    },
    [FAVORITES_PLAYLIST_ID, isFavoritePodcast, addPodcastToPlaylist, removePodcastFromPlaylist],
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

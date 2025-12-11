
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
  const { user } = useUser();

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
          
          let favoritesPlaylist = userOnlyPlaylists.find((p: Playlist) => p.id === FAVORITES_PLAYLIST_ID);
          if (!favoritesPlaylist) {
            favoritesPlaylist = { id: FAVORITES_PLAYLIST_ID, name: "Favorites", podcast_ids: [], isPredefined: false, isFavorite: false };
            userOnlyPlaylists.unshift(favoritesPlaylist);
          }

          setPlaylists([...enrichedPredefined, ...userOnlyPlaylists]);

        } catch (error) {
          console.error("Failed to load guest playlists from localStorage", error);
          setPlaylists(predefinedPlaylists);
        }
      } else {
        // --- LOGGED-IN USER ---
        const { data: userPlaylists, error } = await supabase
          .from('user_playlists')
          .select('*')
          .eq('user_uid', user.uid);
        
        if (error) {
          console.error("Failed to fetch user playlists:", error);
          setPlaylists(predefinedPlaylists); // Fallback to predefined
          return;
        }

        const combinedPlaylists = [...predefinedPlaylists, ...userPlaylists];
        
        let favoritesPlaylist = combinedPlaylists.find(p => p.id === FAVORITES_PLAYLIST_ID && p.user_uid === user.uid);
         if (!favoritesPlaylist) {
            const { data: newFav } = await supabase.from('user_playlists').insert({
                id: FAVORITES_PLAYLIST_ID,
                name: "Favorites", 
                podcast_ids: [],
                user_uid: user.uid
            }).select().single();
            if(newFav) combinedPlaylists.push(newFav);
        }
        
        setPlaylists(combinedPlaylists);
      }
    };

    loadPlaylists();
  }, [user]);

  const savePlaylists = async (updatedPlaylists: Playlist[], playlistToUpdate?: Playlist) => {
    if (user.isGuest) {
      try {
        const playlistsToSave = updatedPlaylists.map(p => {
          const playlistData: Partial<Playlist> = { id: p.id };
          if (p.isPredefined) {
            if (p.isFavorite) {
              playlistData.isFavorite = true;
            } else {
              return null;
            }
          } else {
            playlistData.name = p.name;
            playlistData.podcast_ids = p.podcast_ids || [];
            playlistData.isFavorite = p.isFavorite;
          }
          return playlistData;
        }).filter(Boolean);

        localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlistsToSave));
      } catch (error) {
        console.error("Failed to save guest playlists to localStorage", error);
      }
    } else if (playlistToUpdate && !playlistToUpdate.isPredefined) {
        // For logged-in users, we save directly to DB, this function will just update state
        // The actual DB operation is in the calling function (create, delete, etc.)
    }
    setPlaylists(updatedPlaylists);
  };

  const createPlaylist = useCallback(
    async (name: string, podcastIds: string[] = []) => {
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
        savePlaylists(updatedPlaylists);
      } else {
        const { data: newPlaylist, error } = await supabase
            .from('user_playlists')
            .insert({ name, podcast_ids: podcastIds, user_uid: user.uid })
            .select()
            .single();
        if (error) {
            console.error("Error creating playlist:", error);
            return;
        }
        if (newPlaylist) {
            setPlaylists(prev => [...prev, newPlaylist]);
        }
      }
    },
    [playlists, user],
  );

  const deletePlaylist = useCallback(
    async (playlistId: string) => {
      if (playlistId === FAVORITES_PLAYLIST_ID) return;

      if (user.isGuest) {
        const updatedPlaylists = playlists.filter(
          (playlist) => playlist.id !== playlistId
        );
        savePlaylists(updatedPlaylists);
      } else {
        const { error } = await deletePlaylistAction(playlistId);
        if (error) {
            console.error("Error deleting playlist:", error);
        } else {
            setPlaylists(prev => prev.filter(p => p.id !== playlistId));
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
          savePlaylists(updatedPlaylists);
        } else {
           const { error } = await supabase
            .from('user_playlists')
            .update({ podcast_ids: newPodcastIds })
            .eq('id', playlistId);
          if (error) {
            console.error("Error adding podcast to playlist:", error);
          } else {
            setPlaylists(prev => prev.map(p => p.id === playlistId ? {...p, podcast_ids: newPodcastIds} : p));
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
          savePlaylists(updatedPlaylists);
       } else {
          const { error } = await supabase
            .from('user_playlists')
            .update({ podcast_ids: newPodcastIds })
            .eq('id', playlistId);
          
          if (error) {
            console.error("Error removing podcast from playlist:", error);
          } else {
            setPlaylists(prev => prev.map(p => p.id === playlistId ? {...p, podcast_ids: newPodcastIds} : p));
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
  
  // This is a local-only operation for predefined playlists
  const toggleFavorite = useCallback(
    (playlistId: string) => {
       const updatedPlaylists = playlists.map((playlist) => {
        if (playlist.id === playlistId && playlist.isPredefined) {
          return { ...playlist, isFavorite: !playlist.isFavorite };
        }
        return playlist;
      });
      // For guest, this saves the favorite state to local storage
      // For logged-in users, this state is ephemeral and will reset on reload.
      // A separate DB table would be needed for persistent user favorites of predefined playlists.
      savePlaylists(updatedPlaylists);
    },
    [playlists, user.isGuest]
  );

  const isFavoritePodcast = useCallback(
    (podcastId: string) => {
      const favoritesPlaylist = playlists.find(p => p.id === FAVORITES_PLAYLIST_ID && (user.isGuest || p.user_uid === user.uid));
      return favoritesPlaylist?.podcast_ids?.includes(podcastId) ?? false;
    },
    [playlists, user],
  );


  const toggleFavoritePodcast = useCallback(
    (podcastId: string) => {
      let favoritesPlaylist = playlists.find(p => p.id === FAVORITES_PLAYLIST_ID && (user.isGuest || p.user_uid === user.uid));
      
      if(favoritesPlaylist) {
          const isAlreadyFavorite = favoritesPlaylist.podcast_ids.includes(podcastId);
          if (isAlreadyFavorite) {
              removePodcastFromPlaylist(favoritesPlaylist.id, podcastId);
          } else {
              addPodcastToPlaylist(favoritesPlaylist.id, podcastId);
          }
      }
    },
    [playlists, user, addPodcastToPlaylist, removePodcastFromPlaylist],
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

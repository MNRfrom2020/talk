

import type { Playlist, Podcast } from "@/lib/types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useUser } from "./UserContext";
import { apiClient } from "@/lib/api-client";


const PLAYLIST_STORAGE_KEY = "podcast_playlists_guest";
const FAVORITES_PLAYLIST_NAME = "Favorites";
const GUEST_FAVORITES_PLAYLIST_ID = "favorites-guest";

const hasSuperUserRole = (role?: string | string[]) => {
  const userRoles = Array.isArray(role) ? role : [role || ""];
  return userRoles.some((item) => item.toLowerCase().trim() === "super user");
};

// Matches backend verifyUserRole: ['super user', 'subscriber', 'contributor']
const hasCloudSyncRole = (role?: string | string[]) => {
  const allowedRoles = ['super user', 'subscriber', 'contributor'];
  const userRoles = Array.isArray(role) ? role : [role || ""];
  return userRoles.some((item) => allowedRoles.includes(item.toLowerCase().trim()));
};


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
  const { user, loading: userLoading, toggleFavoritePlaylist: toggleFavoritePlaylistInUser } = useUser();
  const [FAVORITES_PLAYLIST_ID, setFavoritesPlaylistId] = useState<string | undefined>();
  // All syncing roles (super user, subscriber, contributor) can save to the cloud
  const needsCloudSync = !user.isGuest && !!user.uid && hasCloudSyncRole(user.role);

  useEffect(() => {
    const loadPlaylists = async () => {
      // Helper function to update state and cache to storage
      const updateAndCachePlaylists = (newPlaylists: Playlist[], favId?: string) => {
        setPlaylists(newPlaylists);
        if (favId) setFavoritesPlaylistId(favId);
        // Cache All playlists for offline recovery
        localStorage.setItem("podcast_playlists_all_offline_cache", JSON.stringify(newPlaylists));
      };

      try {
        const predefinedPlaylistsDb = await apiClient.get('playlists.php', { action: 'list' });

        let predefinedPlaylists: Playlist[] = (predefinedPlaylistsDb || []).map((p: any) => ({
          ...p,
          id: String(p.id),
          isPredefined: p.isPredefined !== undefined ? !!p.isPredefined : true,
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

            updateAndCachePlaylists([...predefinedPlaylists, ...userOnlyPlaylists], favoritesPlaylist.id);

          } catch (error) {
            console.error("Failed to load guest playlists from localStorage", error);
            updateAndCachePlaylists(predefinedPlaylists);
          }
        } else {
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 🏠 LOCAL USERS (Normal MNR users): Use generic keys, no cloud sync
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          if (!needsCloudSync) {
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

              updateAndCachePlaylists([...predefinedPlaylists, ...userOnlyPlaylists], favoritesPlaylist.id);
            } catch (error) {
              console.error("Failed to load local playlists", error);
              updateAndCachePlaylists(predefinedPlaylists);
            }
          } else {
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // ☁️ SUPER USERS: Use cloud sync with UUID
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

          try {
             // 1. Fetch Cloud Playlists (user-created)
             const userPlaylistsDb = await apiClient.get('playlists.php', { action: 'list', user_uid: user.uid });
             const cloudPlaylists: Playlist[] = (userPlaylistsDb || []).map((p: any) => ({
              ...p,
              id: String(p.id),
              isPredefined: false,
             }));


             // 2. Fetch Favorite Data for predefined playlists
             let favoritePlaylistIds: string[] = [];
             try {
                const favoritesData = await apiClient.get('actions.php', { action: 'get_user_favorites', uid: user.uid });
                favoritePlaylistIds = favoritesData?.playlist_ids || [];
             } catch (err) {
             }

             // 3. Apply favorite status to predefined playlists
             predefinedPlaylists = predefinedPlaylists.map(p => ({
              ...p,
              isFavorite: favoritePlaylistIds.includes(p.id),
             }));


             // 4. Find or Create "Favorites" playlist
             let favPlaylist = cloudPlaylists.find((p: any) => p.name === FAVORITES_PLAYLIST_NAME);
             if (favPlaylist) {
               updateAndCachePlaylists([...predefinedPlaylists, ...cloudPlaylists], favPlaylist.id);
             } else {
               if (user.isExpired) {
                   // If expired, just mock it locally so UI works
                   favPlaylist = { id: Date.now().toString(), name: FAVORITES_PLAYLIST_NAME, podcast_ids: [], isPredefined: false, isFavorite: false, created_at: new Date().toISOString(), cover: null };
                   updateAndCachePlaylists([...predefinedPlaylists, ...cloudPlaylists, favPlaylist], favPlaylist.id);
               } else {
                   // Create on Cloud
                   await apiClient.post('actions.php?action=save_user_playlist', {
                       user_uid: user.uid, role: user.role, name: FAVORITES_PLAYLIST_NAME, podcast_ids: []
                   });
                   const refreshed = await apiClient.get('playlists.php', { action: 'list', user_uid: user.uid });
                   const updatedUserPlaylists = (refreshed || []).map((p: any) => ({...p, id: String(p.id)}));
                   const newFav = updatedUserPlaylists.find((p: any) => p.name === FAVORITES_PLAYLIST_NAME);
                   updateAndCachePlaylists([...predefinedPlaylists, ...updatedUserPlaylists], newFav ? newFav.id : undefined);
               }
             }
          } catch (e) {
             updateAndCachePlaylists(predefinedPlaylists);
          }
          }
        }
      } catch (err) {
          console.error("Error fetching predefined playlists from API (assuming offline):", err);
          
          // Attempt to load from all-in-one offline cache
          const offlineCache = localStorage.getItem("podcast_playlists_all_offline_cache");
          if (offlineCache) {
             try {
                const parsed = JSON.parse(offlineCache);
                const favPlaylist = parsed.find((p: Playlist) => p.name === FAVORITES_PLAYLIST_NAME);
                setPlaylists(parsed);
                if(favPlaylist) setFavoritesPlaylistId(favPlaylist.id);
             } catch(e) {}
          }
      }
    };

    if (!userLoading) {
       loadPlaylists();
    }
  }, [user, userLoading]);

  const persistGenericPlaylists = useCallback((updatedPlaylists: Playlist[]) => {
    try {
      const nonPredefinedPlaylists = updatedPlaylists.filter((p) => !p.isPredefined);
      const predefinedFavorites = updatedPlaylists
        .filter((p) => p.isPredefined && p.isFavorite)
        .map((p) => ({ id: p.id, isFavorite: true }));

      const dataToSave = [...nonPredefinedPlaylists, ...predefinedFavorites];

      localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(dataToSave));
      localStorage.setItem(
        "podcast_playlists_all_offline_cache",
        JSON.stringify(updatedPlaylists),
      );
    } catch (error) {
      console.error("Failed to save local playlists to localStorage", error);
    }

    setPlaylists(updatedPlaylists);
  }, []);

  const savePlaylistsForGuest = (updatedPlaylists: Playlist[]) => {
      persistGenericPlaylists(updatedPlaylists);
  };

  const savePlaylistsForUser = (updatedPlaylists: Playlist[]) => {
    if (needsCloudSync && user.uid) {
      try {
        const userSpecificKey = `podcast_playlists_${user.uid}`;
        const allPlaylists = updatedPlaylists.filter(p => !p.isPredefined || p.isFavorite);
        localStorage.setItem(userSpecificKey, JSON.stringify(allPlaylists));
      } catch (error) {
        console.error("Failed to save user playlists to localStorage", error);
      }
    } else {
      savePlaylistsForGuest(updatedPlaylists);
      return;
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
        if (needsCloudSync && user.uid && !user.isExpired) {
          try {
            const response = await apiClient.post('actions.php?action=save_user_playlist', {
              user_uid: user.uid,
              role: user.role,
              name: name,
              podcast_ids: podcastIds,
              cover: cover
            });

            const newId = response?.id || Date.now().toString();

            const newPlaylist: Playlist = {
              id: newId,
              name,
              podcast_ids: podcastIds,
              isPredefined: false,
              isFavorite: false,
              created_at: new Date().toISOString(),
              cover: cover,
            };
            const updatedPlaylists = [...playlists, newPlaylist];
            savePlaylistsForUser(updatedPlaylists);
          } catch (error) {
            console.error("Failed to create user playlist on cloud:", error);
            // Optionally, we could show a toast or fallback, but failing loudly is better for sync
          }
        } else {
           // Local-only / non-syncing user fallback
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
           savePlaylistsForUser(updatedPlaylists);
        }
      }
    },
    [playlists, user],
  );

  const updatePlaylist = useCallback(
    async (playlistId: string, data: { name?: string; cover?: string | null }) => {
      const playlistToUpdate = playlists.find((p) => p.id === playlistId);
      if (!playlistToUpdate || playlistToUpdate.isPredefined) {
        throw new Error("Cannot update this playlist.");
      }

      const normalizedData = {
        ...data,
        name: data.name?.trim() || playlistToUpdate.name,
        cover: data.cover === "" ? null : (data.cover ?? playlistToUpdate.cover),
      };
      const updatedData = { ...playlistToUpdate, ...normalizedData };
      const updatedPlaylists = playlists.map((p) =>
        p.id === playlistId ? updatedData : p
      );

      if (user.isGuest) {
        // Guest: save to generic localStorage
        persistGenericPlaylists(updatedPlaylists);
      } else if (needsCloudSync) {
        // Super User: update state immediately, then sync to cloud
        if (!user.uid) {
          throw new Error("User not logged in.");
        }

        setPlaylists(updatedPlaylists);

        try {
          await apiClient.post("actions.php?action=save_user_playlist", {
            id: playlistId,
            user_uid: user.uid,
            role: user.role,
            name: normalizedData.name,
            cover: normalizedData.cover,
          });
        } catch (error) {
          // Revert on cloud sync failure
          setPlaylists(playlists);
          throw error;
        }
      } else {
        // Local/DB user (non-super-user, logged in): save to localStorage only
        // Update state immediately and persist to the same storage key that
        // loadPlaylists reads from for local users.
        persistGenericPlaylists(updatedPlaylists);
      }
    },
    [playlists, user, needsCloudSync, persistGenericPlaylists]
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
        const updatedPlaylists = playlists.filter(p => p.id !== playlistId);
        savePlaylistsForUser(updatedPlaylists);
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
      if (!playlist || playlist.podcast_ids.includes(podcastId)) {
        throw new Error("Cannot add to this playlist.");
      }

      const newPodcastIds = [...playlist.podcast_ids, podcastId];
      const updatedPlaylists = playlists.map(p => p.id === playlistId ? {...p, podcast_ids: newPodcastIds} : p);

      // Optimistic UI update
      setPlaylists(updatedPlaylists);

      // Cloud sync
      if (needsCloudSync && user.uid && !user.isExpired) {
        try {
          await apiClient.post('actions.php?action=save_user_playlist', {
            id: playlistId,
            user_uid: user.uid,
            role: user.role,
            podcast_ids: newPodcastIds,
          });
        } catch (err) {
          // Revert on failure
          console.error('Failed to sync playlist add to DB:', err);
          setPlaylists(playlists);
          throw err;
        }
      } else {
        savePlaylistsForUser(updatedPlaylists);
      }
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
    if (!playlist) {
        return Promise.reject(new Error("Playlist not found or user not authorized."));
    }

    const newPodcastIds = playlist.podcast_ids.filter((id) => id !== podcastId);
    const updatedPlaylists = playlists.map(p => p.id === playlistId ? {...p, podcast_ids: newPodcastIds} : p);

    // Optimistic UI update
    setPlaylists(updatedPlaylists);

    // Cloud sync
    if (needsCloudSync && user.uid && !user.isExpired) {
      try {
        await apiClient.post('actions.php?action=save_user_playlist', {
          id: playlistId,
          user_uid: user.uid,
          role: user.role,
          podcast_ids: newPodcastIds,
        });
      } catch (err) {
        // Revert on failure
        console.error('Failed to sync playlist remove to DB:', err);
        setPlaylists(playlists);
        throw err;
      }
    } else {
      savePlaylistsForUser(updatedPlaylists);
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

       if (user.isGuest) {
          // Guest: local only
          const updatedPlaylist = { ...playlist, isFavorite: !playlist.isFavorite };
          const updatedPlaylists = playlists.map(p => p.id === playlistId ? updatedPlaylist : p);
          savePlaylistsForGuest(updatedPlaylists);
       } else {
          // Optimistic UI update immediately
          const updatedPlaylist = { ...playlist, isFavorite: !playlist.isFavorite };
          const updatedPlaylists = playlists.map(p => p.id === playlistId ? updatedPlaylist : p);
          savePlaylistsForUser(updatedPlaylists);

          // Cloud sync for all allowed roles (super user, subscriber, contributor)
          if (needsCloudSync && !user.isExpired) {
             toggleFavoritePlaylistInUser(playlistId).catch(err => {
               console.error('Failed to sync favorite to database:', err);
               // Revert optimistic update on failure
               setPlaylists(playlists);
             });
          }
       }
    },
    [playlists, user, toggleFavoritePlaylistInUser, needsCloudSync]
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
    async (podcastId: string) => {
      if (!FAVORITES_PLAYLIST_ID) {
        console.error("Favorites playlist ID not found");
        return;
      }

      const isAlreadyFavorite = isFavoritePodcast(podcastId);

      // ── Optimistic UI update ──
      const favPlaylist = playlists.find(p => p.id === FAVORITES_PLAYLIST_ID);
      if (favPlaylist) {
        const newIds = isAlreadyFavorite
          ? favPlaylist.podcast_ids.filter(id => id !== podcastId)
          : [...favPlaylist.podcast_ids, podcastId];
        setPlaylists(prev => prev.map(p =>
          p.id === FAVORITES_PLAYLIST_ID ? { ...p, podcast_ids: newIds } : p
        ));
      }

      try {
        if (user.isGuest) {
          // Guest: local only
          if (isAlreadyFavorite) {
            removePodcastFromGuestPlaylist(FAVORITES_PLAYLIST_ID, podcastId);
          } else {
            addPodcastToGuestPlaylist(FAVORITES_PLAYLIST_ID, podcastId);
          }
        } else {
          if (needsCloudSync && user.uid && !user.isExpired) {
            // ── Atomic DB toggle via new endpoint ──
            await apiClient.post('actions.php?action=toggle_favorite_podcast', {
              uid: user.uid,
              podcast_id: podcastId,
            });
            // Sync local state too
            if (isAlreadyFavorite) {
              removePodcastFromGuestPlaylist(FAVORITES_PLAYLIST_ID, podcastId);
            } else {
              addPodcastToGuestPlaylist(FAVORITES_PLAYLIST_ID, podcastId);
            }
          } else {
            // Local-only logged-in user (no sync role)
            if (isAlreadyFavorite) {
              removePodcastFromGuestPlaylist(FAVORITES_PLAYLIST_ID, podcastId);
            } else {
              addPodcastToGuestPlaylist(FAVORITES_PLAYLIST_ID, podcastId);
            }
          }
        }
      } catch (error) {
        console.error("Failed to toggle favorite podcast", error);
        // Revert optimistic update on failure
        if (favPlaylist) {
          setPlaylists(prev => prev.map(p =>
            p.id === FAVORITES_PLAYLIST_ID ? favPlaylist : p
          ));
        }
      }
    },
    [FAVORITES_PLAYLIST_ID, isFavoritePodcast, playlists, user, needsCloudSync,
     addPodcastToGuestPlaylist, removePodcastFromGuestPlaylist],
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

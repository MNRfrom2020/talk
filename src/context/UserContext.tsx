import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { User as DbUser } from "@/lib/types";
import { apiClient } from "@/lib/api-client";
import type { MnrUser } from "@/lib/mnr-auth";

const USER_STORAGE_KEY = "user_profile";




export interface User extends Partial<DbUser> {
  name: string;
  guest_name?: string;
  avatar: string | null;
  isLoggedIn: boolean;
  isGuest: boolean;
  role?: string | string[];
  playlists_ids?: string[];
  authSource?: "custom_db" | "mnr_id";
  expired_at?: string | null;
  isExpired?: boolean;
  needsCloudSync?: boolean;
}

interface UserContextType {
  user: User;
  loading: boolean;
  loginUser: (identifier: string, pass: string) => Promise<void>;
  loginWithMnrId: (mnrUser: MnrUser) => Promise<void>;
  loginAsGuest: (name: string, avatar?: string | null) => void;
  updateUser: (data: { name?: string; avatar?: string | null }) => Promise<void>;
  logout: () => void;
  toggleFavoritePlaylist: (playlistId: string) => Promise<void>;
}

const defaultUser: User = {
  name: "Guest",
  avatar: null,
  isLoggedIn: false,
  isGuest: true,
  playlists_ids: [],
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User>(defaultUser);
  const [loading, setLoading] = useState(true);

  // Initialize guest user - NO UUID needed, just use generic localStorage keys
  useEffect(() => {
  }, []);

  const saveUserToStorage = useCallback((userData: User) => {
    try {
      const json = JSON.stringify(userData);
      const obfuscated = btoa(unescape(encodeURIComponent(json)));
      localStorage.setItem(USER_STORAGE_KEY, obfuscated);
      setUser(userData);
    } catch (error) {
      console.error("Failed to save user to storage", error);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(defaultUser);
    } catch (error) {
      console.error("Failed to clear storage", error);
    }
  }, []);

  // 🔒 Check if user's subscription/role has expired
  const hasAllowedSyncRole = useCallback((role?: string | string[]): boolean => {
    const allowedRoles = ['super user', 'subscriber', 'contributor'];
    const userRoles = Array.isArray(role) ? role : [role || ''];
    return userRoles.some(r => allowedRoles.includes(r.toLowerCase().trim()));
  }, []);

  const checkAndHandleExpiry = useCallback((userData: User): boolean => {
    const rolesThatExpire = ['subscriber', 'contributor'];
    const userRoles = Array.isArray(userData.role) ? userData.role : [userData.role || ''];
    const hasExpirableRole = userRoles.some(role => rolesThatExpire.includes(role.toLowerCase()));

    if (!hasExpirableRole || !userData.expired_at) {
      return false;
    }

    const expiryDate = new Date(userData.expired_at);
    const now = new Date();

    if (expiryDate < now) {
      return true;
    }

    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilExpiry < 24 && hoursUntilExpiry > 0) {
    }

    return false;
  }, []);

  useEffect(() => {
    const revalidateUser = async () => {
      setLoading(true);
      try {
        const storedValue = localStorage.getItem(USER_STORAGE_KEY);
        if (storedValue) {
          let storedUser: User;
          try {
            const decoded = decodeURIComponent(escape(atob(storedValue)));
            storedUser = JSON.parse(decoded) as User;
          } catch (e) {
            storedUser = JSON.parse(storedValue) as User;
          }

          storedUser.isExpired = checkAndHandleExpiry(storedUser);
          storedUser.needsCloudSync = hasAllowedSyncRole(storedUser.role);

          if (storedUser.authSource === "mnr_id" && !storedUser.needsCloudSync) {
            storedUser.uid = undefined;
          }

          if (!storedUser.isGuest && storedUser.uid) {
            if (storedUser.authSource === "mnr_id") {
              // ✅ FIX: MNR ID users — always fetch fresh favorites from DB
              // so playlists_ids is never stale from localStorage.
              if (storedUser.needsCloudSync && !storedUser.isExpired) {
                try {
                  const favData = await apiClient.get('actions.php', {
                    action: 'get_user_favorites',
                    uid: storedUser.uid,
                  });
                  storedUser.playlists_ids = favData?.playlist_ids || storedUser.playlists_ids || [];
                } catch (err) {
                  // Network error — keep localStorage value as fallback
                  console.warn('Could not fetch fresh favorites, using cached value:', err);
                }
              }
              setUser(storedUser);
              setLoading(false);
              return;
            }

            try {
                const data = await apiClient.get("user_auth.php", { action: "profile", uid: storedUser.uid });

                if (data) {
                  const updatedUser: User = {
                    ...storedUser,
                    ...data,
                    name: data.full_name,
                    avatar: data.image,
                    isLoggedIn: true,
                    isGuest: false,
                    playlists_ids: data.playlists_ids || [],
                    expired_at: data.expired_at || storedUser.expired_at,
                  };

                  updatedUser.isExpired = checkAndHandleExpiry(updatedUser);
                  saveUserToStorage(updatedUser);
                  setLoading(false);
                } else {
                  setUser(storedUser);
                  setLoading(false);
                }
            } catch (err) {
                setUser(storedUser);
                setLoading(false);
            }
          } else {
            setUser(storedUser);
            setLoading(false);
          }
        } else {
          setUser(defaultUser);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load or revalidate user from storage", error);
        setUser(defaultUser);
        setLoading(false);
      }
    };

    revalidateUser();
  }, [saveUserToStorage, logout]);

  const loginAsGuest = useCallback(
    (name: string, avatar?: string | null) => {
      const newUserData: User = {
        name: "Guest",
        guest_name: name,
        avatar: avatar === undefined ? user.avatar : avatar,
        isLoggedIn: true,
        isGuest: true,
        playlists_ids: [],
      };
      saveUserToStorage(newUserData);
    },
    [saveUserToStorage, user.avatar],
  );

  const loginUser = async (identifier: string, pass: string) => {
      // Legacy custom DB login
  };

  const loginWithMnrId = async (mnrUser: MnrUser) => {
    try {
      const canSync = hasAllowedSyncRole(mnrUser.role);

      // ✅ FIX: Fetch existing favorites from DB on login
      // so we don't start with playlists_ids: [] and overwrite the DB.
      let existingFavorites: string[] = [];
      if (canSync && mnrUser.id) {
        try {
          const favData = await apiClient.get('actions.php', {
            action: 'get_user_favorites',
            uid: mnrUser.id,
          });
          existingFavorites = favData?.playlist_ids || [];
        } catch (err) {
          console.warn('Could not fetch favorites on login, starting with empty list:', err);
        }
      }

      const loggedInUser: User = {
        uid: canSync ? mnrUser.id : undefined,
        name: mnrUser.name,
        avatar: mnrUser.avatar,
        email: mnrUser.email,
        username: mnrUser.username,
        isLoggedIn: true,
        isGuest: false,
        role: mnrUser.role,
        playlists_ids: existingFavorites,  // DB'র আসল data দিয়ে শুরু
        authSource: 'mnr_id',
        expired_at: mnrUser.expired_at || null,
        isExpired: false,
        needsCloudSync: canSync,
      };

      loggedInUser.isExpired = checkAndHandleExpiry(loggedInUser);
      saveUserToStorage(loggedInUser);

    } catch (error) {
      console.error('❌ MNR ID Login failed:', error);
      throw error;
    }
  };

  const updateUser = async (data: { name?: string; avatar?: string | null }) => {
    if (!user.isLoggedIn) return;

    if (user.isGuest) {
      loginAsGuest(data.name || user.guest_name || "Guest", data.avatar);
    } else {
       const updatedUser = { ...user, ...data };
       saveUserToStorage(updatedUser);
    }
  };

  const toggleFavoritePlaylist = async (playlistId: string) => {
    // Allow all cloud-syncing roles: super user, subscriber, contributor
    const allowedRoles = ['super user', 'subscriber', 'contributor'];
    const userRoles = Array.isArray(user.role) ? user.role : [user.role || ''];
    const canSync = userRoles.some(r => allowedRoles.includes(r.toLowerCase().trim()));
    if (user.isGuest || !user.uid || !canSync) return;

    // ── Optimistic UI update ──
    const currentFavorites = user.playlists_ids || [];
    const isFavorite = currentFavorites.includes(playlistId);
    const newFavorites = isFavorite
      ? currentFavorites.filter(id => id !== playlistId)
      : [...currentFavorites, playlistId];

    setUser(prevUser => ({ ...prevUser, playlists_ids: newFavorites }));

    // ── Send the full updated array to the already-deployed save_user endpoint ──
    try {
      await apiClient.post('actions.php?action=save_user', {
        uid: user.uid,
        playlists_ids: newFavorites,
      });
    } catch (err) {
      // Revert optimistic update on failure
      console.error('Failed to sync favorite playlist to cloud:', err);
      setUser(prevUser => ({ ...prevUser, playlists_ids: currentFavorites }));
    }
  };



  const value = {
    user: {
      ...user,
      name: user.isGuest ? (user.guest_name || "Guest") : (user.name || "User"),
    },
    loading,
    loginUser,
    loginWithMnrId,
    loginAsGuest,
    updateUser,
    logout,
    toggleFavoritePlaylist,
  };

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
};

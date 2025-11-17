
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const USER_STORAGE_KEY = "guest_user_profile";
const SUPER_ADMIN_SESSION_KEY = "super_admin_session";


interface User {
  name: string;
  avatar: string | null;
  isLoggedIn: boolean;
  isSuperAdmin: boolean;
}

interface UserContextType {
  user: User;
  login: (name: string, avatar?: string | null) => void;
  logout: () => void;
  superAdminLogin: () => void;
}

const defaultUser: User = {
  name: "Guest",
  avatar: null,
  isLoggedIn: false,
  isSuperAdmin: false,
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
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      const isSuperAdmin = sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY) === "true";

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if(parsedUser.isLoggedIn) {
          setUser({...parsedUser, isSuperAdmin});
        } else if (isSuperAdmin) {
           setUser({...defaultUser, isSuperAdmin: true, isLoggedIn: true, name: "Super Admin" });
        }
      } else if (isSuperAdmin) {
        setUser({...defaultUser, isSuperAdmin: true, isLoggedIn: true, name: "Super Admin" });
      }
    } catch (error) {
      console.error("Failed to load user from storage", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const saveUser = useCallback((userData: User) => {
    try {
      const userToSave = { name: userData.name, avatar: userData.avatar, isLoggedIn: userData.isLoggedIn };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToSave));
      sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, String(userData.isSuperAdmin));
      setUser(userData);
    } catch (error) {
      console.error("Failed to save user to storage", error);
    }
  }, []);

  const login = useCallback(
    (name: string, avatar?: string | null) => {
      const newUserData: User = {
        name,
        avatar: avatar === undefined ? user.avatar : avatar,
        isLoggedIn: true,
        isSuperAdmin: user.isSuperAdmin,
      };
      saveUser(newUserData);
    },
    [saveUser, user.avatar, user.isSuperAdmin],
  );

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
      setUser(defaultUser);
    } catch (error) {
      console.error("Failed to clear storage", error);
    }
  }, []);
  
  const superAdminLogin = useCallback(() => {
     const newUserData: User = {
        name: "Super Admin",
        avatar: null,
        isLoggedIn: true,
        isSuperAdmin: true,
      };
      saveUser(newUserData);
  }, [saveUser]);


  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  const value = {
    user,
    login,
    logout,
    superAdminLogin,
  };

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
};

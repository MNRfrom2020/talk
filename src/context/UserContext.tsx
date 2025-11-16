
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const USER_STORAGE_KEY = "guest_user_profile";

interface User {
  name: string;
  avatar: string | null;
  isLoggedIn: boolean;
}

interface UserContextType {
  user: User;
  login: (name: string, avatar?: string | null) => void;
  logout: () => void;
}

const defaultUser: User = {
  name: "Guest",
  avatar: null,
  isLoggedIn: false,
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
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if(parsedUser.isLoggedIn) {
          setUser(parsedUser);
        }
      }
    } catch (error) {
      console.error("Failed to load user from localStorage", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const saveUser = useCallback((userData: User) => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Failed to save user to localStorage", error);
    }
  }, []);

  const login = useCallback(
    (name: string, avatar?: string | null) => {
      const newUserData: User = {
        name,
        avatar: avatar === undefined ? user.avatar : avatar,
        isLoggedIn: true,
      };
      saveUser(newUserData);
    },
    [saveUser, user.avatar],
  );

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(defaultUser);
    } catch (error) {
      console.error("Failed to remove user from localStorage", error);
    }
  }, []);

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  const value = {
    user,
    login,
    logout,
  };

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
};

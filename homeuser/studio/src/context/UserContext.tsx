
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { User as DbUser } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const USER_STORAGE_KEY = "user_profile";


export interface User extends Partial<DbUser> {
  name: string;
  avatar: string | null;
  isLoggedIn: boolean;
  isGuest: boolean;
}


interface UserContextType {
  user: User;
  loading: boolean;
  loginAsGuest: (name: string, avatar?: string | null) => void;
  loginWithPassword: (identifier: string, pass: string) => Promise<void>;
  logout: () => void;
}

const defaultUser: User = {
  name: "Guest",
  avatar: null,
  isLoggedIn: false, // Start as logged out
  isGuest: true,
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

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
         // If a registered user's data is in storage, treat them as logged out
         // until they log in again. This prevents stale data issues.
        if (parsedUser.isGuest) {
           setUser(parsedUser);
        } else {
           setUser(defaultUser);
        }
      } else {
        // If no user in storage, set the default guest user
        setUser(defaultUser);
      }
    } catch (error) {
      console.error("Failed to load user from storage", error);
      setUser(defaultUser); // Fallback to guest on error
    } finally {
      setLoading(false);
    }
  }, []);

  const saveUser = useCallback((userData: User) => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Failed to save user to storage", error);
    }
  }, []);

  const loginAsGuest = useCallback(
    (name: string, avatar?: string | null) => {
      const newUserData: User = {
        name,
        avatar: avatar === undefined ? user.avatar : avatar,
        isLoggedIn: true,
        isGuest: true,
      };
      saveUser(newUserData);
    },
    [saveUser, user.avatar],
  );

  const loginWithPassword = async (identifier: string, pass: string) => {
    // Clear any existing local user data first
    localStorage.removeItem(USER_STORAGE_KEY);

    const isEmail = identifier.includes("@");

    const query = isEmail
      ? supabase.from("users").select().eq("email", identifier)
      : supabase.from("users").select().eq("username", identifier);

    const { data, error } = await query.single();

    if (error || !data) {
      throw new Error("ব্যবহারকারী খুঁজে পাওয়া যায়নি।");
    }
    
    const trimmedDbPass = data.pass?.trim();
    const trimmedInputPass = pass.trim();

    if (trimmedDbPass !== trimmedInputPass) {
      throw new Error("ভুল পাসওয়ার্ড।");
    }

    const { pass: removedPass, ...userData } = data;

    const loggedInUser: User = {
      ...userData,
      name: userData.name,
      avatar: userData.image,
      isLoggedIn: true,
      isGuest: false,
    };
    saveUser(loggedInUser);
  };


  const logout = useCallback(() => {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(defaultUser);
    } catch (error) {
      console.error("Failed to clear storage", error);
    }
  }, []);
  
  const value = {
    user,
    loading,
    loginAsGuest,
    loginWithPassword,
    logout,
  };

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
};

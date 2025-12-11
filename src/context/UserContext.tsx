
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
import { saveUser as saveUserAction } from "@/lib/actions";

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
  loginUser: (identifier: string, pass: string) => Promise<void>;
  loginAsGuest: (name: string, avatar?: string | null) => void;
  updateUser: (data: { name?: string; avatar?: string | null }) => Promise<void>;
  logout: () => void;
}

const defaultUser: User = {
  name: "Guest",
  avatar: null,
  isLoggedIn: false,
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
        setUser(parsedUser);
      } else {
        setUser(defaultUser);
      }
    } catch (error) {
      console.error("Failed to load user from storage", error);
      setUser(defaultUser);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveUserToStorage = useCallback((userData: User) => {
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
      saveUserToStorage(newUserData);
    },
    [saveUserToStorage, user.avatar],
  );

  const loginUser = async (identifier: string, pass: string) => {
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

    localStorage.removeItem(USER_STORAGE_KEY);

    const { pass: removedPass, ...userData } = data;

    const loggedInUser: User = {
      ...userData,
      name: data.full_name,
      avatar: userData.image,
      isLoggedIn: true,
      isGuest: false,
    };
    saveUserToStorage(loggedInUser);
  };

  const updateUser = async (data: { name?: string; avatar?: string | null }) => {
    if (!user.isLoggedIn) return;

    const updatedUser = { ...user, ...data };
    
    if (user.isGuest) {
      loginAsGuest(updatedUser.name, updatedUser.avatar);
    } else {
       saveUserToStorage(updatedUser);
    }
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
    loginUser,
    loginAsGuest,
    updateUser,
    logout,
  };

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
};

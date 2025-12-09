
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
  login: (name: string, avatar?: string | null) => void;
  loginWithPassword: (identifier: string, pass: string) => Promise<void>;
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
        if(parsedUser.isLoggedIn) {
          setUser(parsedUser);
        }
      }
    } catch (error) {
      console.error("Failed to load user from storage", error);
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

  const login = useCallback(
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
    const isEmail = identifier.includes('@');
    
    const query = isEmail 
      ? supabase.from('users').select().eq('email', identifier)
      : supabase.from('users').select().eq('username', identifier);

    const { data, error } = await query.single();

    if (error || !data) {
      throw new Error("ব্যবহারকারী খুঁজে পাওয়া যায়নি।");
    }

    if (data.pass !== pass) {
      throw new Error("ভুল পাসওয়ার্ড।");
    }
    
    const loggedInUser: User = {
      ...data,
      name: data.name,
      avatar: data.image,
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
  
  if (loading) {
    return null; // Or a loading spinner
  }

  const value = {
    user,
    loading,
    login,
    loginWithPassword,
    logout,
  };

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
};

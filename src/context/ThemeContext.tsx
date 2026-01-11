
"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { themes } from "@/lib/themes";

const THEME_STORAGE_KEY = "app_theme";

type ThemeContextType = {
  theme: string;
  setTheme: (themeId: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState("theme-default");

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "theme-default";
    setThemeState(storedTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove any existing theme classes
    themes.forEach(t => root.classList.remove(t.id));

    // Add the current theme class
    root.classList.add(theme);

    // Persist to local storage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (themeId: string) => {
    const themeExists = themes.some(t => t.id === themeId);
    if (themeExists) {
      setThemeState(themeId);
    }
  };

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

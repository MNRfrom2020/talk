"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Admin } from "@admin/lib/types";

export type AdminAuthContextType = {
  admin: Admin | null;
  signIn: (username: string, password: string) => Promise<void>;
  setAdmin: (admin: Admin | null) => void;
  signOut: () => void;
  loading: boolean;
};

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined,
);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};

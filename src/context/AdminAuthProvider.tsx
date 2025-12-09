"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Admin } from "@/lib/types";
import { AdminAuthContext } from "./AdminAuthContext";

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedAdmin = localStorage.getItem("admin-user");
        if (storedAdmin) {
          setAdmin(JSON.parse(storedAdmin));
        }
      } catch (error) {
        console.error("Failed to parse admin user from localStorage", error);
        localStorage.removeItem("admin-user");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (
      !loading &&
      !admin &&
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/admin/dashboard")
    ) {
      router.push("/admin/login");
    }
  }, [admin, loading, router]);

  const signIn = async (username: string, password: string) => {
    const { data, error } = await supabase
      .from("admins")
      .select("username, password, uid, role, created_at")
      .eq("username", username)
      .single();

    if (error) {
      throw new Error("অ্যাডমিন খুঁজে পাওয়া যায়নি।");
    }

    if (data.password !== password) {
      throw new Error("ভুল পাসওয়ার্ড।");
    }

    const { ...adminData } = data;
    setAdmin(adminData as Admin);
    localStorage.setItem("admin-user", JSON.stringify(adminData));
  };

  const signOut = () => {
    setAdmin(null);
    localStorage.removeItem("admin-user");
    router.push("/admin/login");
  };

  const value = {
    admin,
    signIn,
    signOut,
    loading,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

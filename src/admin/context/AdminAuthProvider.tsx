
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import type { Admin } from "@admin/lib/types";
import { AdminAuthContext } from "./AdminAuthContext";

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: userLoading, logout } = useUser();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userLoading) return;

    // Check if the user has admin roles (PostgreSQL array support)
    const roles = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
    const isAdmin = user.isLoggedIn && (
      roles.includes("Super Admin") || 
      roles.includes("Super User") || 
      roles.includes("superadmin")
    );
    
    if (isAdmin) {
      setAdmin({
        id: user.uid || "",
        name: user.name || "",
        email: user.email || "",
        avatar: user.avatar || "",
        role: Array.isArray(user.role) ? user.role.join(", ") : (user.role || ""),
        username: user.username || ""
      } as Admin);
    } else {
      setAdmin(null);
      // Silent redirect to home if trying to access admin path without permission
      if (window.location.pathname.startsWith("/antro/admin")) {
        navigate("/", { replace: true });
        return;
      }
    }
    setLoading(false);
  }, [user, userLoading, navigate]);

  const signIn = async () => {
    navigate("/login");
  };

  const signOut = () => {
    setAdmin(null);
    logout();
    navigate("/");
  };

  if (loading || userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const value = {
    admin,
    signIn,
    setAdmin,
    signOut,
    loading: loading || userLoading,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

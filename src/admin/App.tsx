
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./pages/admin/dashboard/DashboardLayout";
import DashboardPage from "./pages/admin/dashboard/DashboardPage";
import AudiosPage from "./pages/admin/dashboard/audios/AudiosPage";
import CategoriesPage from "./pages/admin/dashboard/categories/CategoriesPage";
import ArtistsPage from "./pages/admin/dashboard/artists/ArtistsPage";
import PlaylistsPage from "./pages/admin/dashboard/playlists/PlaylistsPage";
import { AdminAuthProvider } from "./context/AdminAuthProvider";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "./components/ui/toaster";
import "./admin-globals.css";

function AdminApp() {
  return (
    <div className="dark theme-default admin-theme admin-panel min-h-screen shadow-none border-none bg-background text-foreground">
      <ThemeProvider>
        <AdminAuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="dashboard" replace />} />
            <Route path="login" element={<Navigate to="/login" replace />} />
            <Route path="dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="audios" element={<AudiosPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="artists" element={<ArtistsPage />} />
              <Route path="playlists" element={<PlaylistsPage />} />
            </Route>
          </Routes>
          <Toaster />
        </AdminAuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default AdminApp;

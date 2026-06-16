import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { PodcastProvider } from "@/context/PodcastContext";
import { PlayerProvider } from "@/context/PlayerContext";
import { PlaylistProvider } from "@/context/PlaylistContext";
import { UserProvider } from "@/context/UserContext";
import { ThemeProvider } from "@/context/ThemeContext";

// Pages
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Library from "@/pages/Library";
import Profile from "@/pages/Profile";
import Downloads from "@/pages/Downloads";
import Artists from "@/pages/Artists";
import ArtistDetails from "@/pages/ArtistDetails";
import Categories from "@/pages/Categories";
import CategoryDetails from "@/pages/CategoryDetails";
import PlaylistDetails from "@/pages/PlaylistDetails";
import PodcastDetails from "@/pages/PodcastDetails";
import AuthCallback from "@/pages/AuthCallback";
import OfflineRedirect from "@/components/layout/OfflineRedirect";
import AdminApp from "@/admin/App";

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <PodcastProvider>
          <PlaylistProvider>
            <PlayerProvider>
              <OfflineRedirect />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/library" element={<Library />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/downloads" element={<Downloads />} />
                <Route path="/artists" element={<Artists />} />
                <Route path="/artists/:artistName" element={<ArtistDetails />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/categories/:categoryName" element={<CategoryDetails />} />
                <Route path="/playlists/:playlistId" element={<PlaylistDetails />} />
                <Route path="/podcasts/:podcastId" element={<PodcastDetails />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/antro/admin/*" element={<AdminApp />} />
              </Routes>
              <Toaster />
            </PlayerProvider>
          </PlaylistProvider>
        </PodcastProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

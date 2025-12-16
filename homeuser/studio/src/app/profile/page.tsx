
import { cookies } from "next/headers";
import { AnimatePresence } from "framer-motion";
import { redirect } from "next/navigation";

import AppSidebar from "@/components/layout/AppSidebar";
import Player from "@/components/layout/Player";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getRecentListeningStats, getPodcasts } from "@/lib/data";
import { usePlaylist } from "@/context/PlaylistContext"; // This seems odd in a server component. Let's see if we can get playlist data differently.
import { type User } from "@/context/UserContext";
import ProfileClientPage from "./ProfileClientPage";

// A helper function to get user from cookies - this should be robust
const getUserFromCookies = (): User | null => {
  const cookieStore = cookies();
  const userCookie = cookieStore.get("user_profile");
  if (userCookie) {
    try {
      const user = JSON.parse(userCookie.value);
      // We should only proceed if it's a logged-in user, not a guest
      if (!user.isGuest && user.uid) {
        return user;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
};

// This is a server-side helper. It should probably live in a different file but for now, this is okay.
const getFavoritePodcasts = async (allPodcasts: any[], user: User) => {
    if (user.isGuest || !user.playlists_ids) {
        // Guest logic or no favorites logic
        return [];
    }
    // This is a simplified logic. A real app might need a dedicated function.
    // Assuming `FAVORITES_PLAYLIST_ID` is somehow accessible or we find it by name.
    // For now, let's assume we can't get favorite podcasts on the server easily without more context.
    // We will pass all podcasts and let the client figure it out for now.
    // A better approach would be to fetch this from the DB directly.
    return [];
};


export default async function ProfilePage() {
    const user = getUserFromCookies();

    if (!user) {
        // If no user, or user is a guest, they shouldn't be here.
        // Redirect them to the login or home page.
        redirect("/");
    }

    const stats = await getRecentListeningStats(user.uid as string);
    const allPodcasts = await getPodcasts();

    return (
        <ProfileClientPage 
            initialUser={user} 
            initialStats={stats} 
            allPodcasts={allPodcasts}
        />
    );
}

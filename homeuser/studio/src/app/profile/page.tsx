
"use client";

import * as React from "react";
import ProfileClientPage from "./ProfileClientPage";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { getRecentListeningStats } from "@/lib/data";
import { usePodcast } from "@/context/PodcastContext";
import type { Podcast } from "@/lib/types";

export default function ProfilePage() {
  const { user, loading } = useUser();
  const { podcasts } = usePodcast();
  const router = useRouter();

  const [stats, setStats] = React.useState({
    totalPlayed: 0,
    favoriteArtist: "N/A",
    favoriteCategory: "N/A",
  });
  const [isStatsLoading, setIsStatsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!loading && !user.isLoggedIn) {
      router.push("/");
    }
  }, [user, loading, router]);

  React.useEffect(() => {
    if (user.uid && !user.isGuest) {
      setIsStatsLoading(true);
      getRecentListeningStats(user.uid)
        .then(setStats)
        .finally(() => setIsStatsLoading(false));
    } else {
        // For guest users, stats can be calculated on the client side if needed
        // For now, we'll just show zeros.
        setStats({ totalPlayed: 0, favoriteArtist: "N/A", favoriteCategory: "N/A" });
        setIsStatsLoading(false);
    }
  }, [user]);

  if (loading || !user.isLoggedIn) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  return <ProfileClientPage initialUser={user} initialStats={stats} allPodcasts={podcasts as Podcast[]} />;
}

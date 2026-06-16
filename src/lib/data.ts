import { apiClient } from "./api-client";
import type { Podcast, Playlist, User } from "./types";
import { startOfDay, subDays, formatISO } from "date-fns";

export async function getPodcastCount() {
  const stats = await apiClient.get("stats.php", { action: "counts" }).catch(() => ({}));
  return stats.podcasts ?? 0;
}

export async function getUserCount() {
  const stats = await apiClient.get("stats.php", { action: "counts" }).catch(() => ({}));
  return stats.users ?? 0;
}

export async function getPlaylistCount() {
    const stats = await apiClient.get("stats.php", { action: "counts" }).catch(() => ({}));
    return stats.playlists ?? 0;
}

export async function getPodcasts(): Promise<Podcast[]> {
  try {
    const data = await apiClient.get("podcasts.php", { action: "list" });
    
    // Map snake_case to camelCase
    return data.map((item: any) => ({
      id: item.id,
      title: item.title,
      artist: item.artist,
      categories: item.categories,
      coverArt: item.cover_art,
      coverArtHint: item.cover_art_hint,
      audioUrl: item.audio_url,
      created_at: item.created_at,
    }));
  } catch (error) {
    console.error("Error fetching podcasts:", error);
    return [];
  }
}

export async function getPlaylists(): Promise<Playlist[]> {
  try {
    return await apiClient.get("playlists.php", { action: "list" });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return [];
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    return await apiClient.get("users.php", { action: "list" });
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function getListeningActivity(userId: string) {
  const sevenDaysAgo = formatISO(startOfDay(subDays(new Date(), 6)));
  
  try {
    const data = await apiClient.get("stats.php", { 
        action: "listening_activity",
        user_uid: userId, 
        since: sevenDaysAgo 
    });

    const activityByDate: Record<string, number> = {};

    data.forEach((item: any) => {
      const date = item.last_played_at.split("T")[0];
      if (!activityByDate[date]) {
        activityByDate[date] = 0;
      }
      activityByDate[date] += (item.duration || 0);
    });

    return activityByDate;
  } catch (error) {
    console.error("Error fetching listening activity:", error);
    return {};
  }
}

export async function getRecentListeningStats(userId: string) {
  const thirtyDaysAgo = formatISO(subDays(new Date(), 30));

  try {
    const data = await apiClient.get("stats.php", { 
        action: "listening_stats", 
        user_uid: userId, 
        since: thirtyDaysAgo 
    });

    const playedPodcastIds = new Set<string>();
    const artistCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    data.forEach((item: any) => {
      playedPodcastIds.add(item.id);

      const artists = Array.isArray(item.artist) ? item.artist : [item.artist];
      artists.forEach((artist) => {
        if (artist) artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
      });

      const categories = Array.isArray(item.categories) ? item.categories : [item.categories];
      categories.forEach((category: string) => {
        if (category) categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });
    });

    const totalPlayed = playedPodcastIds.size;
    const favoriteArtist = [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const favoriteCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    return { totalPlayed, favoriteArtist, favoriteCategory };
  } catch (error) {
    console.error("Error fetching listening stats:", error);
    return { totalPlayed: 0, favoriteArtist: "N/A", favoriteCategory: "N/A" };
  }
}

export async function getPaginatedPodcasts(page: number, limit: number) {
  const offset = (page - 1) * limit;

  try {
    const data = await apiClient.get("podcasts.php", { action: "list", limit, offset });
    const stats = await apiClient.get("stats.php", { action: "counts" });
    
    const typedData = data.map((item: any) => ({
      id: item.id,
      title: item.title,
      artist: item.artist,
      categories: item.categories,
      coverArt: item.cover_art,
      coverArtHint: item.cover_art_hint,
      audioUrl: item.audio_url,
      created_at: item.created_at,
    }));
    
    return { podcasts: typedData, count: stats.podcasts ?? 0 };
  } catch (error) {
    console.error("Error fetching paginated podcasts:", error);
    return { podcasts: [], count: 0 };
  }
}

export async function getPaginatedUsers(page: number, limit: number) {
  const offset = (page - 1) * limit;

  try {
    const data = await apiClient.get("users.php", { action: "list", limit, offset });
    const stats = await apiClient.get("stats.php", { action: "counts" });
    return { users: data as User[], count: stats.users ?? 0 };
  } catch (error) {
    console.error("Error fetching paginated users:", error);
    return { users: [], count: 0 };
  }
}

export async function getPaginatedPlaylists(page: number, limit: number) {
  const offset = (page - 1) * limit;

  try {
    const data = await apiClient.get("playlists.php", { action: "list", limit, offset });
    const stats = await apiClient.get("stats.php", { action: "counts" });
    return { playlists: data as Playlist[], count: stats.playlists ?? 0 };
  } catch (error) {
    console.error("Error fetching paginated playlists:", error);
    return { playlists: [], count: 0 };
  }
}

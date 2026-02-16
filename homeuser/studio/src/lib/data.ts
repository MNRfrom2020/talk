
"use server";

import { supabase } from "./supabase";
import type { Podcast, Playlist, User } from "./types";
import { startOfDay, subDays, formatISO } from "date-fns";

export async function getPodcastCount() {
  const { count, error } = await supabase
    .from("podcasts")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error fetching podcast count:", error);
    return 0;
  }
  return count ?? 0;
}

export async function getUserCount() {
  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error fetching user count:", error);
    return 0;
  }

  return count ?? 0;
}

export async function getPlaylistCount() {
  const { count, error } = await supabase
    .from("playlists")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error fetching playlist count:", error);
    return 0;
  }
  return count ?? 0;
}

export async function getPodcasts(): Promise<Podcast[]> {
  const { data, error } = await supabase
    .from("podcasts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching podcasts:", error);
    return [];
  }

  // Map snake_case to camelCase
  return data.map((item) => ({
    id: item.id,
    title: item.title,
    artist: item.artist,
    categories: item.categories,
    coverArt: item.cover_art,
    coverArtHint: item.cover_art_hint,
    audioUrl: item.audio_url,
    created_at: item.created_at,
  }));
}

export async function getPlaylists(): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from("playlists")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching playlists:", error);
    return [];
  }

  return data;
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  return data;
}

export async function getListeningActivity(userId: string) {
  const sevenDaysAgo = formatISO(startOfDay(subDays(new Date(), 6)));

  const { data, error } = await supabase
    .from("listening_history")
    .select("duration, last_played_at")
    .eq("user_uid", userId)
    .gte("last_played_at", sevenDaysAgo);

  if (error) {
    console.error("Error fetching listening activity:", error);
    return {};
  }

  const activityByDate: Record<string, number> = {};

  data.forEach((item) => {
    const date = item.last_played_at.split("T")[0];
    if (!activityByDate[date]) {
      activityByDate[date] = 0;
    }
    activityByDate[date] += item.duration;
  });

  return activityByDate;
}

export async function getRecentListeningStats(userId: string) {
  const thirtyDaysAgo = formatISO(subDays(new Date(), 30));

  const { data, error } = await supabase
    .from("listening_history")
    .select("podcasts ( artist, categories )")
    .eq("user_uid", userId)
    .gte("last_played_at", thirtyDaysAgo);

  if (error || !data) {
    console.error("Error fetching listening stats:", error);
    return { totalPlayed: 0, favoriteArtist: "N/A", favoriteCategory: "N/A" };
  }

  const playedPodcastIds = new Set<string>();
  const artistCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  data.forEach((item: any) => {
    if (item.podcasts) {
      playedPodcastIds.add(item.podcasts.id);

      const artists = Array.isArray(item.podcasts.artist)
        ? item.podcasts.artist
        : [item.podcasts.artist];
      artists.forEach((artist) => {
        if (artist) artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
      });

      item.podcasts.categories.forEach((category: string) => {
        if (category)
          categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });
    }
  });

  const totalPlayed = playedPodcastIds.size;

  const favoriteArtist =
    [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  const favoriteCategory =
    [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  return { totalPlayed, favoriteArtist, favoriteCategory };
}


export async function getPaginatedPodcasts(page: number, limit: number) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  const { data, error, count } = await supabase
    .from("podcasts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(startIndex, endIndex);

  if (error) {
    console.error("Error fetching paginated podcasts:", error);
    return { podcasts: [], count: 0 };
  }
  const typedData = data.map((item) => ({
    id: item.id,
    title: item.title,
    artist: item.artist,
    categories: item.categories,
    coverArt: item.cover_art,
    coverArtHint: item.cover_art_hint,
    audioUrl: item.audio_url,
    created_at: item.created_at,
  }));
  return { podcasts: typedData, count: count ?? 0 };
}

export async function getPaginatedUsers(page: number, limit: number) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  const { data, error, count } = await supabase
    .from("users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(startIndex, endIndex);

  if (error) {
    console.error("Error fetching paginated users:", error);
    return { users: [], count: 0 };
  }
  return { users: data as User[], count: count ?? 0 };
}

export async function getPaginatedPlaylists(page: number, limit: number) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  const { data, error, count } = await supabase
    .from("playlists")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(startIndex, endIndex);

  if (error) {
    console.error("Error fetching paginated playlists:", error);
    return { playlists: [], count: 0 };
  }
  return { playlists: data as Playlist[], count: count ?? 0 };
}

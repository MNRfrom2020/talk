
import { api } from "./api";
import type { Artist, Category, Podcast, Playlist } from "./types";

export async function getPodcastCount() {
  try {
    const data = await api.get("/stats.php");
    return data.podcasts ?? 0;
  } catch (error) {
    console.error("Error fetching podcast count:", error);
    return 0;
  }
}

export async function getArtistCount() {
  try {
    const data = await api.get("/stats.php");
    return data.artists ?? 0;
  } catch (error) {
    console.error("Error fetching artist count:", error);
    return 0;
  }
}

export async function getCategoryCount() {
    try {
      const data = await api.get("/stats.php");
      return data.categories ?? 0;
    } catch (error) {
      console.error("Error fetching category count:", error);
      return 0;
    }
}

export async function getPlaylistCount() {
  try {
    const data = await api.get("/stats.php");
    return data.playlists ?? 0;
  } catch (error) {
    console.error("Error fetching playlist count:", error);
    return 0;
  }
}

const mapPodcast = (item: any): Podcast => ({
  id: item.id,
  title: item.title,
  artist: item.artist ?? [],
  artist_uuids: item.artist_uuids ?? [],
  categories: item.categories ?? [],
  category_uuids: item.category_uuids ?? [],
  coverArt: item.cover_art,
  coverArtHint: item.cover_art_hint,
  audioUrl: item.audio_url,
  created_at: item.created_at,
});

const mapPlaylist = (item: any): Playlist => ({
  id: item.id,
  name: item.name,
  description: item.description ?? "",
  podcast_ids: item.podcast_ids ?? [],
  created_at: item.created_at,
  coverArt: item.cover_art ?? null,
});

export async function getPodcasts(): Promise<Podcast[]> {
  try {
    const response = await api.get("/podcasts.php", { limit: 1000 });
    return response.data.map(mapPodcast);
  } catch (error) {
    console.error("Error fetching podcasts:", error);
    return [];
  }
}

export async function getPlaylists(): Promise<Playlist[]> {
  try {
    const response = await api.get("/playlists.php", { limit: 1000 });
    return response.data.map(mapPlaylist);
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return [];
  }
}

export async function getArtists(): Promise<Artist[]> {
  try {
    const response = await api.get("/artists.php", { limit: 1000 });
    return response.data;
  } catch (error) {
    console.error("Error fetching artists:", error);
    return [];
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const response = await api.get("/categories.php", { limit: 1000 });
    return response.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function getPaginatedPodcasts(page: number, limit: number) {
  try {
    const offset = (page - 1) * limit;
    const response = await api.get("/podcasts.php", { limit, offset });
    const typedData = response.data.map(mapPodcast);
    return { podcasts: typedData, count: response.count ?? 0 };
  } catch (error) {
    console.error("Error fetching paginated podcasts:", error);
    return { podcasts: [], count: 0 };
  }
}

export async function getPaginatedArtists(page: number, limit: number) {
  try {
    const offset = (page - 1) * limit;
    const response = await api.get("/artists.php", { limit, offset });
    return { artists: response.data as Artist[], count: response.count ?? 0 };
  } catch (error) {
    console.error("Error fetching paginated artists:", error);
    return { artists: [], count: 0 };
  }
}

export async function getPaginatedCategories(page: number, limit: number) {
  try {
    const offset = (page - 1) * limit;
    const response = await api.get("/categories.php", { limit, offset });
    return { categories: response.data as Category[], count: response.count ?? 0 };
  } catch (error) {
    console.error("Error fetching paginated categories:", error);
    return { categories: [], count: 0 };
  }
}

export async function getPaginatedPlaylists(page: number, limit: number) {
  try {
    const offset = (page - 1) * limit;
    const response = await api.get("/playlists.php", { limit, offset });
    return { playlists: response.data.map(mapPlaylist) as Playlist[], count: response.count ?? 0 };
  } catch (error) {
    console.error("Error fetching paginated playlists:", error);
    return { playlists: [], count: 0 };
  }
}

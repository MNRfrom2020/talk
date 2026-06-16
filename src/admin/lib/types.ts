
export type Podcast = {
  id: string;
  title: string;
  artist: string[];
  artist_uuids: string[];
  categories: string[];
  category_uuids: string[];
  coverArt: string;
  coverArtHint: string;
  audioUrl: string;
  created_at: string;
};

export type Playlist = {
  id: string;
  name: string;
  description?: string | null;
  podcast_ids: string[];
  created_at: string;
  coverArt: string | null;
};

export type Artist = {
  uuid: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  created_at: string;
  podcast_count: number;
};

export type Category = {
  uuid: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  created_at: string;
  podcast_count: number;
};

export type Admin = {
  uid: string;
  username: string;
  name?: string;
  email?: string;
  avatar?: string;
  password?: string;
  role: "superadmin" | "admin" | "editor" | "Super Admin" | "Super User" | string;
  created_at?: string;
  id?: string;
};

export type User = {
  uid: string;
  full_name: string;
  image: string | null;
  username: string;
  email: string;
  pass: string;
  created_at: string;
  updated_at: string;
  playlists_ids: string[];
};


export type Podcast = {
  id: string;
  title: string;
  artist: string[];
  categories: string[];
  coverArt: string;
  coverArtHint: string;
  audioUrl: string;
  created_at: string;
};

export type Playlist = {
  id: string;
  name: string;
  podcast_ids: string[];
  created_at: string;
  cover: string | null;
  user_uid?: string; // For user-created playlists in DB
  isPredefined?: boolean; // For local predefined playlists
  isFavorite?: boolean; // For local state management
};

export type Admin = {
  uid: string;
  username: string;
  password?: string; // Should be handled securely, ideally not stored client-side
  role: "superadmin" | "admin" | "editor";
  created_at: string;
};

export type User = {
  uid: string;
  full_name: string;
  image: string | null;
  username: string;
  email: string;
  pass?: string;
  created_at: string;
  updated_at: string;
  playlists_ids?: string[];
};

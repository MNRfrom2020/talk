
export type Podcast = {
  id: string;
  title: string;
  artist: string[];
  categories: string[];
  coverArt: string;
  coverArtHint: string;
  audioUrl: string;
  created_at?: string;
};

export type Playlist = {
  id: string;
  name:string;
  podcastIds: string[];
  isPredefined?: boolean;
  isFavorite?: boolean;
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
  name: string;
  image: string | null;
  username: string;
  email: string;
  pass: string;
  created_at: string;
};

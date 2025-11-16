
export type Podcast = {
  id: string;
  title: string;
  artist: string;
  categories: string[];
  coverArt: string;
  coverArtHint: string;
  audioUrl: string;
};

export type Playlist = {
  id: string;
  name:string;
  podcastIds: string[];
  isPredefined?: boolean;
  isFavorite?: boolean;
};

export type MyAudio = {
  id: string;
  title: string;
  artist: string;
  categories: string[];
  coverArt: string;
  coverArtHint: string;
  audioUrl: string;
};

export type MyPlaylist = {
  id: string;
  name:string;
  podcastIds: string[];
};

import podcastsData from "./podcasts.json";

export type Podcast = {
  id: string;
  title: string;
  artist: string;
  categories: string[];
  coverArt: string;
  coverArtHint: string;
  audioUrl: string;
};

export const podcasts: Podcast[] = podcastsData as Podcast[];

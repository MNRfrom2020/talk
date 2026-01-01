
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Podcast } from '@/lib/types';

export async function GET() {
  const { data: playlistsData, error: playlistsError } = await supabase
    .from('playlists')
    .select('*')
    .order('created_at', { ascending: false });

  if (playlistsError) {
    return NextResponse.json({ error: playlistsError.message }, { status: 500 });
  }

  // Get all podcast IDs from all playlists
  const allPodcastIds = [...new Set(playlistsData.flatMap(p => p.podcast_ids || []))];

  // Fetch all required podcasts in a single query
  const { data: podcastsData, error: podcastsError } = await supabase
    .from('podcasts')
    .select('*')
    .in('id', allPodcastIds);

  if (podcastsError) {
     return NextResponse.json({ error: podcastsError.message }, { status: 500 });
  }

  const podcastsMap = new Map<string, Podcast>(
    podcastsData.map(p => [String(p.id), {
        id: String(p.id),
        title: p.title,
        artist: p.artist,
        categories: p.categories,
        coverArt: p.cover_art,
        coverArtHint: p.cover_art_hint,
        audioUrl: p.audio_url,
        created_at: p.created_at,
    }])
  );

  const playlistsWithPodcasts = playlistsData.map(playlist => {
    const podcasts = (playlist.podcast_ids || [])
      .map((id: string) => podcastsMap.get(id))
      .filter((p): p is Podcast => !!p);
    
    return {
      id: String(playlist.id),
      name: playlist.name,
      cover: playlist.cover,
      created_at: playlist.created_at,
      podcasts: podcasts,
    };
  });

  return NextResponse.json(playlistsWithPodcasts);
}

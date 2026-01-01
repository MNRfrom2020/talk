
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('podcasts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const podcasts = data.map(item => ({
    id: String(item.id),
    title: item.title,
    artist: item.artist,
    categories: item.categories,
    coverArt: item.cover_art,
    coverArtHint: item.cover_art_hint,
    audioUrl: item.audio_url,
    created_at: item.created_at,
  }));

  return NextResponse.json(podcasts);
}

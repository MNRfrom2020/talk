
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Podcast ID is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('podcasts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // PostgREST error for "No rows found"
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  if (!data) {
     return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
  }

  const podcast = {
    id: String(data.id),
    title: data.title,
    artist: data.artist,
    categories: data.categories,
    coverArt: data.cover_art,
    coverArtHint: data.cover_art_hint,
    audioUrl: data.audio_url,
    created_at: data.created_at,
  };

  return NextResponse.json(podcast);
}

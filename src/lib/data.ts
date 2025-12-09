
import { supabase } from "./supabase";

export async function getPodcastCount() {
    const { count, error } = await supabase
        .from('podcasts')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error fetching podcast count:", error);
        return 0;
    }
    return count ?? 0;
}

export async function getUserCount() {
    const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error("Error fetching user count:", error);
        return 0;
    }

    return count ?? 0;
}

export async function getPlaylistCount() {
     const { count, error } = await supabase
        .from('playlists')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error fetching playlist count:", error);
        return 0;
    }
    return count ?? 0;
}

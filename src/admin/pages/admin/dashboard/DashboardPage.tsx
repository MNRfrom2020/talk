
import { useEffect, useState } from "react";
import StatCards from "@admin/components/admin/StatCards";
import { getArtistCount, getCategoryCount, getPlaylistCount, getPodcastCount } from "@admin/lib/data";

export default function DashboardPage() {
    const [counts, setCounts] = useState({
        podcastCount: 0,
        artistCount: 0,
        categoryCount: 0,
        playlistCount: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCounts() {
            try {
                const [p, a, c, pl] = await Promise.all([
                    getPodcastCount(),
                    getArtistCount(),
                    getCategoryCount(),
                    getPlaylistCount()
                ]);
                setCounts({
                    podcastCount: p,
                    artistCount: a,
                    categoryCount: c,
                    playlistCount: pl
                });
            } catch (error) {
                console.error("Failed to fetch counts", error);
            } finally {
                setLoading(false);
            }
        }
        fetchCounts();
    }, []);

    if (loading) {
        return <div className="p-4 sm:p-6 lg:p-8">লোড হচ্ছে...</div>;
    }

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <h1 className="font-headline text-3xl font-bold tracking-tight mb-6">
              ড্যাশবোর্ড
            </h1>
            <StatCards
                podcastCount={counts.podcastCount}
                artistCount={counts.artistCount}
                categoryCount={counts.categoryCount}
                playlistCount={counts.playlistCount}
            />
             <div className="mt-8">
              {/* Other dashboard components can go here */}
            </div>
        </main>
    );
}

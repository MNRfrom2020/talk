import StatCards from "@/components/admin/StatCards";
import { getPodcastCount, getUserCount, getPlaylistCount } from "@/lib/data";

export default async function DashboardPage() {
    const podcastCount = await getPodcastCount();
    const userCount = await getUserCount();
    const playlistCount = await getPlaylistCount();

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <h1 className="font-headline text-3xl font-bold tracking-tight mb-6">
              ড্যাশবোর্ড
            </h1>
            <StatCards
                podcastCount={podcastCount}
                userCount={userCount}
                playlistCount={playlistCount}
            />
             <div className="mt-8">
              {/* Other dashboard components can go here */}
            </div>
        </main>
    );
}

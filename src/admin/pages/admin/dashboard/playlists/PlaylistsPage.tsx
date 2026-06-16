
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getPaginatedPlaylists, getPodcasts } from "@admin/lib/data";
import { PlaylistsDataTable } from "@admin/components/admin/playlists/DataTable";
import { columns } from "@admin/components/admin/playlists/columns";
import { Playlist, Podcast } from "@admin/lib/types";

const ITEMS_PER_PAGE = 12;

export default function PlaylistsPage() {
  const [searchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const [data, setData] = useState<{ playlists: Playlist[], count: number }>({ playlists: [], count: 0 });
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [playlistData, podcastData] = await Promise.all([
          getPaginatedPlaylists(currentPage, ITEMS_PER_PAGE),
          getPodcasts()
        ]);
        setData(playlistData);
        setPodcasts(podcastData);
      } catch (error) {
        console.error("Failed to fetch playlists", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentPage]);

  const totalPages = Math.ceil((data.count ?? 0) / ITEMS_PER_PAGE);

  if (loading) {
     return <div className="p-4 sm:p-6 lg:p-8">লোড হচ্ছে...</div>;
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        প্লেলিস্ট
      </h1>
      <PlaylistsDataTable
        columns={columns}
        data={data.playlists}
        podcasts={podcasts}
        pageCount={totalPages}
      />
    </main>
  );
}

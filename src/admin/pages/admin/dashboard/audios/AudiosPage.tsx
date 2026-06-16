
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getArtists, getCategories, getPaginatedPodcasts } from "@admin/lib/data";
import { AudiosDataTable } from "@admin/components/admin/audios/DataTable";
import { columns } from "@admin/components/admin/audios/columns";
import { Artist, Category, Podcast } from "@admin/lib/types";

const ITEMS_PER_PAGE = 20;

export default function AudiosPage() {
  const [searchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const [data, setData] = useState<{ podcasts: Podcast[]; count: number }>({ podcasts: [], count: 0 });
  const [artists, setArtists] = useState<Artist[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [podcastResult, artistResult, categoryResult] = await Promise.all([
        getPaginatedPodcasts(currentPage, ITEMS_PER_PAGE),
        getArtists(),
        getCategories(),
      ]);
      setData(podcastResult);
      setArtists(artistResult);
      setCategories(categoryResult);
    } catch (error) {
      console.error("Failed to fetch podcasts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const totalPages = Math.ceil((data.count ?? 0) / ITEMS_PER_PAGE);

  if (loading) {
     return <div className="p-4 sm:p-6 lg:p-8">লোড হচ্ছে...</div>;
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        অডিওসমূহ
      </h1>
      <AudiosDataTable
        columns={columns}
        data={data.podcasts}
        artists={artists}
        categories={categories}
        pageCount={totalPages}
      />
    </main>
  );
}

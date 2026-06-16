
import { useEffect, useState } from "react";
import EntityManager from "@admin/components/admin/taxonomy/EntityManager";
import { getArtists } from "@admin/lib/data";
import { Artist } from "@admin/lib/types";

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getArtists();
        setArtists(data);
      } catch (error) {
        console.error("Failed to fetch artists", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
     return <div className="p-4 sm:p-6 lg:p-8">লোড হচ্ছে...</div>;
  }

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        আর্টিস্ট
      </h1>
      <EntityManager type="artist" entities={artists} />
    </main>
  );
}

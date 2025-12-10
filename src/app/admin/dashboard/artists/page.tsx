import ArtistList from "@/components/admin/audios/ArtistList";
import { getPodcasts } from "@/lib/data";

export default async function ArtistsPage() {
  const podcasts = await getPodcasts();

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        আর্টিস্ট
      </h1>
      <ArtistList podcasts={podcasts} />
    </main>
  );
}

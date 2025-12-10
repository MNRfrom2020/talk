
import { getPlaylists, getPodcasts } from "@/lib/data";
import { PlaylistsDataTable } from "@/components/admin/playlists/DataTable";
import { columns } from "@/components/admin/playlists/columns";

export default async function PlaylistsPage() {
  const playlists = await getPlaylists();
  const podcasts = await getPodcasts();

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        প্লেলিস্ট
      </h1>
      <PlaylistsDataTable
        columns={columns}
        data={playlists}
        podcasts={podcasts}
      />
    </main>
  );
}

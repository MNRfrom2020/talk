
import { getPaginatedPlaylists, getPodcasts } from "@/lib/data";
import { PlaylistsDataTable } from "@/components/admin/playlists/DataTable";
import { columns } from "@/components/admin/playlists/columns";

const ITEMS_PER_PAGE = 12;

export default async function PlaylistsPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const currentPage = Number(searchParams?.page) || 1;
  const { playlists, count } =
    await getPaginatedPlaylists(currentPage, ITEMS_PER_PAGE);
  const totalPages = Math.ceil((count ?? 0) / ITEMS_PER_PAGE);

  // getPodcasts is still needed for the playlist detail sheet view
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
        pageCount={totalPages}
      />
    </main>
  );
}

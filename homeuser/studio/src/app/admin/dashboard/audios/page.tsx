import { getPaginatedPodcasts } from "@/lib/data";
import { AudiosDataTable } from "@/components/admin/audios/DataTable";
import { columns } from "@/components/admin/audios/columns";

const ITEMS_PER_PAGE = 20;

export default async function AudiosPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const currentPage = Number(searchParams?.page) || 1;
  const { podcasts, count } = await getPaginatedPodcasts(
    currentPage,
    ITEMS_PER_PAGE,
  );
  const totalPages = Math.ceil((count ?? 0) / ITEMS_PER_PAGE);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        অডিওসমূহ
      </h1>
      <AudiosDataTable
        columns={columns}
        data={podcasts}
        pageCount={totalPages}
      />
    </main>
  );
}

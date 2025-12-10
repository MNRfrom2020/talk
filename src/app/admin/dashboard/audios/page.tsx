import { getPodcasts } from "@/lib/data";
import { AudiosDataTable } from "@/components/admin/audios/DataTable";
import { columns } from "@/components/admin/audios/columns";

export default async function AudiosPage() {
  const podcasts = await getPodcasts();

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        অডিওসমূহ
      </h1>
      <AudiosDataTable columns={columns} data={podcasts} />
    </main>
  );
}

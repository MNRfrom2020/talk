import CategoryList from "@/components/admin/audios/CategoryList";
import { getPodcasts } from "@/lib/data";

export default async function CategoriesPage() {
  const podcasts = await getPodcasts();

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        ক্যাটাগরি
      </h1>
      <CategoryList podcasts={podcasts} />
    </main>
  );
}


import { useEffect, useState } from "react";
import EntityManager from "@admin/components/admin/taxonomy/EntityManager";
import { getCategories } from "@admin/lib/data";
import { Category } from "@admin/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories", error);
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
    <main className="p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        ক্যাটাগরি
      </h1>
      <EntityManager type="category" entities={categories} />
    </main>
  );
}

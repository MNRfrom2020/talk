
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getPaginatedUsers } from "@admin/lib/data";
import { UsersDataTable } from "@admin/components/admin/users/DataTable";
import { columns } from "@admin/components/admin/users/columns";
import { User } from "@admin/lib/types";

const ITEMS_PER_PAGE = 12;

export default function UsersPage() {
  const [searchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const [data, setData] = useState<{ users: User[], count: number }>({ users: [], count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const result = await getPaginatedUsers(currentPage, ITEMS_PER_PAGE);
        setData(result);
      } catch (error) {
        console.error("Failed to fetch users", error);
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
        ব্যবহারকারীগণ
      </h1>
      <UsersDataTable columns={columns} data={data.users} pageCount={totalPages} />
    </main>
  );
}

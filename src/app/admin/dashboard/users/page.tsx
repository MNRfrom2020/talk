
import { getPaginatedUsers } from "@/lib/data";
import { UsersDataTable } from "@/components/admin/users/DataTable";
import { columns } from "@/components/admin/users/columns";

const ITEMS_PER_PAGE = 12;

export const dynamic = 'force-dynamic';

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const currentPage = Number(searchParams?.page) || 1;
  const { users, count } = await getPaginatedUsers(currentPage, ITEMS_PER_PAGE);
  const totalPages = Math.ceil((count ?? 0) / ITEMS_PER_PAGE);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        ব্যবহারকারীগণ
      </h1>
      <UsersDataTable columns={columns} data={users} pageCount={totalPages} />
    </main>
  );
}

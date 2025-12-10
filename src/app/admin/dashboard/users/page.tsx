
import { getUsers } from "@/lib/data";
import { UsersDataTable } from "@/components/admin/users/DataTable";
import { columns } from "@/components/admin/users/columns";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
        ব্যবহারকারীগণ
      </h1>
      <UsersDataTable columns={columns} data={users} />
    </main>
  );
}


"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UserForm from "./UserForm";
import type { User } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CellActions } from "./columns";
import UserCard from "./UserCard";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount: number;
}

export function UsersDataTable<TData extends User, TValue>({
  columns: initialColumns,
  data,
  pageCount,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = searchParams.get("page") ?? "1";
  const currentPage = Number(page);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<TData | null>(null);

  const handleAddNew = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const handleEdit = (user: TData) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const columns = React.useMemo<ColumnDef<TData, TValue>[]>(
    () => {
      return initialColumns.map((col) => {
        if ("id" in col && col.id === "actions") {
          return {
            ...col,
            cell: (props) => (
              <CellActions {...(props as any)} onEdit={handleEdit} />
            ),
          };
        }
        return col;
      });
    },
    [initialColumns],
  );

  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: 12,
      },
    },
  });
  
  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `/admin/dashboard/users?${params.toString()}`;
  };


  return (
    <div className="w-full">
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-sm" />
          <Button onClick={handleAddNew} className="w-full md:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <UserCard
                key={row.id}
                user={row.original}
                onEdit={handleEdit}
              />
            ))
          ) : (
            <div className="col-span-full h-24 text-center">No results.</div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
             {table.getRowModel().rows.length} user(s) on this page.
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
               onClick={() => router.push(createPageURL(currentPage - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(createPageURL(currentPage + 1))}
              disabled={currentPage >= pageCount}
            >
              Next
            </Button>
          </div>
        </div>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? "Edit User" : "Add New User"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh] pr-6">
            <UserForm
              user={selectedUser}
              onClose={() => setIsFormOpen(false)}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

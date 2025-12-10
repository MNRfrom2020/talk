"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PlusCircle } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function UsersDataTable<TData extends User, TValue>({
  columns: initialColumns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [globalFilter, setGlobalFilter] = React.useState("");
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

  const columns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    return initialColumns.map((col) => {
      if ("id" in col && col.id === "actions") {
        return {
          ...col,
          cell: (props) => <CellActions {...(props as any)} onEdit={handleEdit} />,
        };
      }
      return col;
    });
  }, [initialColumns]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    globalFilterFn: (row, columnId, filterValue) => {
      const user = row.original as User;
      const search = filterValue.toLowerCase();

      return (
        user.full_name.toLowerCase().includes(search) ||
        user.username.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    },
  });

  return (
    <div className="w-full">
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <div className="flex items-center justify-between py-4">
          <Input
            placeholder="নাম, ইউজারনেম বা ইমেইল দিয়ে খুঁজুন..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
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

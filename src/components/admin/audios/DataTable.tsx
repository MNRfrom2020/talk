
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
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
import AudioForm from "./AudioForm";
import type { Podcast } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import AudioCard from "./AudioCard";
import { CellActions } from "./columns";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function AudiosDataTable<TData extends Podcast, TValue>({
  columns: initialColumns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedPodcast, setSelectedPodcast] = React.useState<TData | null>(
    null,
  );

  const handleAddNew = () => {
    setSelectedPodcast(null);
    setIsFormOpen(true);
  };

  const handleEdit = (podcast: TData) => {
    setSelectedPodcast(podcast);
    setIsFormOpen(true);
  };

  const columns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
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
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
    globalFilterFn: (row, columnId, filterValue) => {
        const podcast = row.original as Podcast;
        const search = filterValue.toLowerCase();
        
        return (
          podcast.title.toLowerCase().includes(search) ||
          podcast.artist.some(a => a.toLowerCase().includes(search)) ||
          podcast.categories.some(c => c.toLowerCase().includes(search))
        );
      },
  });

  return (
    <div className="w-full">
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <Input
            placeholder="শিরোনাম, আর্টিস্ট বা ক্যাটাগরি খুঁজুন..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-full md:max-w-sm"
          />
          <Button onClick={handleAddNew} className="w-full md:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Audio
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3">
          {table.getRowModel().rows.map((row) => (
            <AudioCard
              key={row.id}
              podcast={row.original as TData}
              onEdit={handleEdit}
            />
          ))}
        </div>

        <div className="flex items-center justify-between space-x-2 py-4">
           <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} audio(s) found.
          </div>
           <div className="flex items-center space-x-2">
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
        </div>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedPodcast ? "Edit Audio" : "Add New Audio"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh] pr-6">
            <AudioForm
              podcast={selectedPodcast}
              onClose={() => setIsFormOpen(false)}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

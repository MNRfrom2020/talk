
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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PlaylistForm from "./PlaylistForm";
import type { Playlist, Podcast } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CellActions } from "./columns";
import PlaylistCard from "./PlaylistCard";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  podcasts: Podcast[];
}

export function PlaylistsDataTable<TData extends Playlist, TValue>({
  columns: initialColumns,
  data,
  podcasts,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedPlaylist, setSelectedPlaylist] =
    React.useState<TData | null>(null);

  const handleAddNew = () => {
    setSelectedPlaylist(null);
    setIsFormOpen(true);
  };

  const handleEdit = (playlist: TData) => {
    setSelectedPlaylist(playlist);
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
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 12,
      },
    },
     globalFilterFn: (row, columnId, filterValue) => {
        const playlist = row.original as Playlist;
        const search = filterValue.toLowerCase();
        
        return (
          playlist.name.toLowerCase().includes(search)
        );
      },
  });

  return (
    <div className="w-full">
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <Input
            placeholder="প্লেলিস্ট খুঁজুন..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-full md:max-w-sm"
          />
          <Button onClick={handleAddNew} className="w-full md:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Playlist
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <PlaylistCard
                key={row.id}
                playlist={row.original}
                onEdit={() => handleEdit(row.original)}
              />
            ))
          ) : (
            <div className="col-span-full h-24 text-center">No results.</div>
          )}
        </div>

        <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.length} of {data.length}{" "}
              playlist(s).
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
              <span className="text-sm">
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

        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>
              {selectedPlaylist ? "Edit Playlist" : "Add New Playlist"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <PlaylistForm
              playlist={selectedPlaylist}
              allPodcasts={podcasts}
              onClose={() => setIsFormOpen(false)}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

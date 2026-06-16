
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PlusCircle } from "lucide-react";

import { Button } from "@admin/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@admin/components/ui/dialog";
import AudioForm from "./AudioForm";
import type { Artist, Category, Podcast } from "@admin/lib/types";
import { ScrollArea } from "@admin/components/ui/scroll-area";
import AudioCard from "./AudioCard";
import { CellActions } from "./columns";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  artists: Artist[];
  categories: Category[];
  pageCount: number;
}

export function AudiosDataTable<TData extends Podcast, TValue>({
  columns: initialColumns,
  data,
  artists,
  categories,
  pageCount,
}: DataTableProps<TData, TValue>) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const page = searchParams.get("page") ?? "1";
  const currentPage = Number(page);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
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
            <CellActions {...(props as any)} onEdit={handleEdit as any} />
          ),
        };
      }
      return col;
    });
  }, [initialColumns]);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: 20,
      },
    },
  });
  
  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `/antro/admin/dashboard/audios?${params.toString()}`;
  };


  return (
    <div className="w-full">
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-sm" />
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
              onEdit={handleEdit as any}
            />
          ))}
        </div>

        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getRowModel().rows.length} audio(s) on this page.
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(createPageURL(currentPage - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(createPageURL(currentPage + 1))}
              disabled={currentPage >= pageCount}
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
              artists={artists}
              categories={categories}
              onClose={() => {
                  setIsFormOpen(false);
                  window.location.reload();
              }}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

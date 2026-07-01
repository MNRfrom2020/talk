
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PlusCircle, ChevronUp, ChevronDown, Pencil } from "lucide-react";

import { Button } from "@admin/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@admin/components/ui/dialog";
import PlaylistForm from "./PlaylistForm";
import type { Playlist, Podcast } from "@admin/lib/types";
import { ScrollArea } from "@admin/components/ui/scroll-area";
import { CellActions } from "./columns";
import PlaylistCard from "./PlaylistCard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@admin/components/ui/sheet";
import AudioForm from "../audios/AudioForm";
import { api } from "@admin/lib/api";
import { useToast } from "@admin/hooks/use-toast";

const ITEMS_PER_PAGE = 20;

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    onPageChange(currentPage + 1);
  };

  return (
    <div className="flex items-center justify-center space-x-2 pt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        disabled={currentPage === 1}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    </div>
  );
};

const PlaylistDetailSheet = ({
  playlist,
  allPodcasts,
  onEdit,
  onReorderComplete,
}: {
  playlist: Playlist;
  allPodcasts: Podcast[];
  onEdit: (podcast: Podcast) => void;
  onReorderComplete?: () => void;
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const { toast } = useToast();

  const podcastMap = React.useMemo(
    () => new Map(allPodcasts.map((p) => [p.id, p])),
    [allPodcasts],
  );

  const [orderedIds, setOrderedIds] = React.useState<string[]>(
    () => playlist.podcast_ids ?? [],
  );

  React.useEffect(() => {
    setOrderedIds(playlist.podcast_ids ?? []);
    setCurrentPage(1);
  }, [playlist.id]);

  const podcastsInPlaylist = React.useMemo(
    () =>
      orderedIds
        .map((id) => podcastMap.get(id))
        .filter((p): p is Podcast => !!p),
    [orderedIds, podcastMap],
  );

  const totalPages = Math.ceil(podcastsInPlaylist.length / ITEMS_PER_PAGE);

  const currentPodcasts = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return podcastsInPlaylist.slice(startIndex, endIndex);
  }, [podcastsInPlaylist, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const saveOrder = (newIds: string[]) => {
    api
      .post("/playlists.php", {
        action: "reorder",
        playlist_id: playlist.id,
        podcast_ids: newIds,
      })
      .then(() => {
        toast({ title: "Order saved" });
        if (onReorderComplete) onReorderComplete();
      })
      .catch((err) => {
        console.error("Failed to save reorder:", err);
        toast({ variant: "destructive", title: "Failed to save order" });
        setOrderedIds(playlist.podcast_ids ?? []);
      });
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentPodcasts.length) return;

    // Map page-local index to global index in orderedIds
    const globalSource = (currentPage - 1) * ITEMS_PER_PAGE + index;
    const globalTarget = (currentPage - 1) * ITEMS_PER_PAGE + targetIndex;

    const newIds = Array.from(orderedIds);
    [newIds[globalSource], newIds[globalTarget]] = [newIds[globalTarget], newIds[globalSource]];

    setOrderedIds(newIds);
    saveOrder(newIds);
  };

  return (
    <SheetContent className="sm:max-w-xl md:max-w-2xl">
      <SheetHeader>
        <SheetTitle>
          {playlist.name} ({podcastsInPlaylist.length})
        </SheetTitle>
      </SheetHeader>
      <div className="flex h-full flex-col">
        <ScrollArea className="flex-1 pr-6">
          <div className="flex flex-col gap-2 py-4 md:gap-3">
            {currentPodcasts.map((podcast, index) => {
              const uploadedAt = podcast.created_at
                ? new Date(podcast.created_at).toLocaleDateString()
                : null;
              return (
                <div
                  key={podcast.id}
                  className="flex items-stretch gap-3 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-secondary/50 md:gap-4 md:p-4"
                >
                  {/* Left: Cover art + text */}
                  <div className="flex flex-1 items-center gap-3 md:gap-4">
                    <img
                      src={podcast.coverArt}
                      alt={podcast.title}
                      className="h-14 w-14 flex-shrink-0 rounded-md object-cover md:h-16 md:w-16"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <h3 className="font-semibold leading-tight line-clamp-2">
                        {podcast.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {Array.isArray(podcast.artist)
                          ? podcast.artist.join(", ")
                          : podcast.artist}
                      </p>
                      {uploadedAt && (
                        <p className="text-xs text-muted-foreground">
                          {uploadedAt}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {podcast.categories?.slice(0, 3).map((category) => (
                          <span
                            key={category}
                            className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Button column */}
                  <div className="flex flex-col items-end justify-between gap-1">
                    {/* Top: Move Up / Move Down */}
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0}
                        onClick={() => moveItem(index, "up")}
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === currentPodcasts.length - 1}
                        onClick={() => moveItem(index, "down")}
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Bottom: Edit button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(podcast)}
                      aria-label="Edit audio"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </SheetContent>
  );
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  podcasts: Podcast[];
  pageCount: number;
  onRefresh?: () => void;
}

export function PlaylistsDataTable<TData extends Playlist, TValue>({
  columns: initialColumns,
  data,
  podcasts,
  pageCount,
  onRefresh,
}: DataTableProps<TData, TValue>) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const page = searchParams.get("page") ?? "1";
  const currentPage = Number(page);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAudioFormOpen, setIsAudioFormOpen] = React.useState(false);
  const [selectedPodcast, setSelectedPodcast] = React.useState<Podcast | null>(
    null,
  );

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

  const handleAudioEdit = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setIsAudioFormOpen(true);
  };

  const columns = React.useMemo<ColumnDef<TData, TValue>[]>(
    () => {
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
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: 12,
      },
    },
  });
  
  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `/antro/admin/dashboard/playlists?${params.toString()}`;
  };


  return (
    <div className="w-full">
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-sm" />
          <Button onClick={handleAddNew} className="w-full md:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Playlist
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <Sheet key={row.original.id}>
                <SheetTrigger asChild>
                  <div className="cursor-pointer">
                    <PlaylistCard
                      playlist={row.original}
                      onEdit={() => handleEdit(row.original)}
                    />
                  </div>
                </SheetTrigger>
                <PlaylistDetailSheet
                  playlist={row.original}
                  allPodcasts={podcasts}
                  onEdit={handleAudioEdit}
                />
              </Sheet>
            ))
          ) : (
            <div className="col-span-full h-24 text-center">No results.</div>
          )}
        </div>

        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getRowModel().rows.length} playlist(s) on this page.
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
            <span className="text-sm">
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
              onClose={() => {
                setIsFormOpen(false);
                if (onRefresh) onRefresh();
              }}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isAudioFormOpen} onOpenChange={setIsAudioFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Audio</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh] pr-6">
            <AudioForm
              podcast={selectedPodcast}
              onClose={() => setIsAudioFormOpen(false)}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

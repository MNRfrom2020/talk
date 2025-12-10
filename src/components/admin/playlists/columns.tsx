
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Trash2 } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import type { Playlist } from "@/lib/types";
import { deletePlaylist } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import * as React from "react";
import { Badge } from "@/components/ui/badge";

export const CellActions = ({
  row,
  onEdit,
}: {
  row: { original: Playlist };
  onEdit: (playlist: Playlist) => void;
}) => {
  const playlist = row.original;
  const { toast } = useToast();

  const handleDelete = async () => {
    const result = await deletePlaylist(playlist.id);
    if (result.message?.includes("Error")) {
      toast({
        variant: "destructive",
        title: "Error deleting playlist",
        description: result.message,
      });
    } else {
      toast({
        title: "Playlist deleted",
        description: `"${playlist.name}" has been deleted.`,
      });
    }
  };

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onEdit(playlist)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            playlist and remove its data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


export const columns: ColumnDef<Playlist>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const playlist = row.original;
      return (
        <div className="flex items-center gap-4">
          {playlist.cover && (
            <Image
              src={playlist.cover}
              alt={playlist.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-md object-cover"
            />
          )}
          <div className="flex-1 truncate">
            <div className="font-medium truncate">{playlist.name}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "podcast_ids",
    header: "Audios",
    cell: ({ row }) => {
      const podcastIds = row.getValue("podcast_ids") as string[];
      return <Badge variant="secondary">{podcastIds.length} audios</Badge>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string;
      return (
        <div className="font-medium">
          {new Date(date).toLocaleDateString()}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: CellActions as any, // Cast to any to satisfy the complex type with props
  },
];

import * as React from "react";
import { MoreHorizontal, PlusCircle, Trash2 } from "lucide-react";

import { deleteArtist, deleteCategory } from "@admin/lib/actions";
import type { Artist, Category } from "@admin/lib/types";
import { useToast } from "@admin/hooks/use-toast";
import { Button } from "@admin/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@admin/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@admin/components/ui/dialog";
import { Input } from "@admin/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@admin/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@admin/components/ui/dropdown-menu";
import EntityForm from "./EntityForm";

type Entity = Artist | Category;

interface EntityManagerProps {
  type: "artist" | "category";
  entities: Entity[];
}

export default function EntityManager({ type, entities }: EntityManagerProps) {
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [selectedEntity, setSelectedEntity] = React.useState<Entity | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Entity | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const filteredEntities = React.useMemo(
    () =>
      entities.filter((entity) =>
        entity.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [entities, search],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const action = type === "artist" ? deleteArtist : deleteCategory;
    const result = await action(deleteTarget.uuid);

    if (result.message?.includes("Error")) {
      toast({ variant: "destructive", title: "Delete failed", description: result.message });
      return;
    }

    toast({ title: "Deleted", description: `"${deleteTarget.name}" deleted successfully.` });
    setDeleteTarget(null);
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder={`${type === "artist" ? "আর্টিস্ট" : "ক্যাটাগরি"} খুঁজুন...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:max-w-sm"
        />
        <Button
          onClick={() => {
            setSelectedEntity(null);
            setIsFormOpen(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          নতুন {type === "artist" ? "আর্টিস্ট" : "ক্যাটাগরি"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEntities.map((entity) => (
          <Card key={entity.uuid}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-lg">{entity.name}</CardTitle>
                <div className="text-sm text-muted-foreground">{entity.podcast_count} linked audio(s)</div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedEntity(entity);
                      setIsFormOpen(true);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeleteTarget(entity)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-3">
              {entity.image_url ? (
                <img src={entity.image_url} alt={entity.name} className="aspect-video w-full rounded-md object-cover" />
              ) : null}
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {entity.description || "No description"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{selectedEntity ? "Edit" : "Add"} {type === "artist" ? "Artist" : "Category"}</DialogTitle>
          </DialogHeader>
          <EntityForm
            entity={selectedEntity}
            type={type}
            onClose={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the {type} and its links from related podcasts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


import {
  Card,
  CardContent,
} from "@admin/components/ui/card";
import { Badge } from "@admin/components/ui/badge";
import { CellActions } from "./columns";
import type { Playlist } from "@admin/lib/types";
import { ListMusic } from "lucide-react";

interface PlaylistCardProps {
  playlist: Playlist;
  onEdit: (playlist: Playlist) => void;
}

export default function PlaylistCard({ playlist, onEdit }: PlaylistCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col p-4">
        <div className="relative mb-2 aspect-square w-full">
          {playlist.coverArt ? (
            <img
              src={playlist.coverArt}
              alt={playlist.name}
              className="h-full w-full rounded-md object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-md bg-secondary">
              <ListMusic className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold line-clamp-2">{playlist.name}</h3>
            <div className="-mr-2 -mt-2">
              <CellActions row={{ original: playlist }} onEdit={onEdit} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            <Badge variant="secondary">
              {playlist.podcast_ids.length} audios
            </Badge>
          </div>
          {playlist.description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{playlist.description}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

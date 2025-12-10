
"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CellActions } from "./columns";
import type { Podcast } from "@/lib/types";

interface AudioCardProps {
  podcast: Podcast;
  onEdit: (podcast: Podcast) => void;
}

export default function AudioCard({ podcast, onEdit }: AudioCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-4">
        <Image
          src={podcast.coverArt}
          alt={podcast.title}
          width={80}
          height={80}
          className="h-20 w-20 rounded-md object-cover"
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold line-clamp-2">{podcast.title}</h3>
            <div className="-mr-2">
              <CellActions row={{ original: podcast }} onEdit={onEdit} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {podcast.artist.join(", ")}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {podcast.categories.slice(0, 3).map((category) => (
              <Badge key={category} variant="secondary">
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

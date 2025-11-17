
"use client";

import Image from "next/image";
import { ListMusic, X, GripVertical } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Reorder } from "framer-motion";

export function QueueSheet({ children }: { children: React.ReactNode }) {
  const {
    currentTrack,
    queue,
    reorderQueue,
    playTrackFromQueue,
    removeFromQueue,
  } = usePlayer();

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="bottom"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[60vh] flex-col rounded-t-lg"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ListMusic />
            Up Next
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="flex flex-col gap-2">
              {currentTrack && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    Now Playing
                  </h3>
                  <div
                    className={cn(
                      "group flex items-center gap-4 rounded-md p-2",
                      "border border-primary bg-primary/10",
                    )}
                  >
                    <Image
                      src={currentTrack.coverArt}
                      alt={currentTrack.title}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-md"
                    />
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate font-semibold text-primary">
                        {currentTrack.title}
                      </p>
                      <p className="truncate text-sm text-primary/80">
                        {currentTrack.artist.join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {queue.length > 0 && currentTrack && (
                <Separator className="my-2" />
              )}

              {queue.length > 0 ? (
                <Reorder.Group
                  axis="y"
                  values={queue}
                  onReorder={reorderQueue}
                  className="space-y-2"
                >
                  {queue.map((track) => (
                    <Reorder.Item
                      key={track.id}
                      value={track}
                      className="group flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                    >
                      <div className="cursor-grab text-muted-foreground">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <button
                        className="flex flex-1 items-center gap-4 overflow-hidden text-left"
                        onClick={() => playTrackFromQueue(track.id)}
                      >
                        <Image
                          src={track.coverArt}
                          alt={track.title}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-md"
                        />
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate font-semibold">
                            {track.title}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {track.artist.join(", ")}
                          </p>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => removeFromQueue(track.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              ) : (
                <div className="flex h-48 items-center justify-center text-center">
                  <p className="text-muted-foreground">The queue is empty.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import Image from "next/image";
import { ListMusic, X, ChevronUp, ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import * as React from "react";
import { SaveQueueDialog } from "../playlists/SaveQueueDialog";

export function QueueSheet({ children }: { children: React.ReactNode }) {
  const {
    currentTrack,
    queue,
    playTrackFromQueue,
    removeFromQueue,
    moveTrackInQueue,
  } = usePlayer();
  
  const hasQueue = currentTrack || queue.length > 0;

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
            Playlist
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
                         {Array.isArray(currentTrack.artist) ? currentTrack.artist.join(", ") : currentTrack.artist}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {queue.length > 0 && currentTrack && (
                <Separator className="my-2" />
              )}

              {queue.length > 0 ? (
                <div className="space-y-2">
                  {queue.map((track, index) => (
                    <div
                      key={track.id}
                      className="group flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-secondary"
                    >
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === 0}
                          onClick={() => moveTrackInQueue(track.id, "up")}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === queue.length - 1}
                          onClick={() => moveTrackInQueue(track.id, "down")}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
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
                          <p className="truncate font-semibold">{track.title}</p>
                          <p className="truncate text-sm text-muted-foreground">
                             {Array.isArray(track.artist) ? track.artist.join(", ") : track.artist}
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-center">
                  <p className="text-muted-foreground">The queue is empty.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
         <SheetFooter className="mt-4">
           <SaveQueueDialog>
            <Button
              variant="outline"
              className="w-full"
              disabled={!hasQueue}
            >
              Save as Playlist
            </Button>
          </SaveQueueDialog>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
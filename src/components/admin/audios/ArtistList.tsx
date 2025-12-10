
"use client";

import { useMemo, useState } from "react";
import type { Podcast } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import AudioForm from "./AudioForm";
import AudioCard from "./AudioCard";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

const ArtistDetailSheet = ({
  artistName,
  podcasts,
  onEdit,
}: {
  artistName: string;
  podcasts: Podcast[];
  onEdit: (podcast: Podcast) => void;
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(podcasts.length / ITEMS_PER_PAGE);

  const currentPodcasts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return podcasts.slice(startIndex, endIndex);
  }, [podcasts, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <SheetContent className="sm:max-w-xl md:max-w-2xl">
      <SheetHeader>
        <SheetTitle>
          {artistName} ({podcasts.length})
        </SheetTitle>
      </SheetHeader>
      <div className="flex h-full flex-col">
        <ScrollArea className="flex-1 pr-6">
          <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
            {currentPodcasts.map((podcast) => (
              <AudioCard
                key={podcast.id}
                podcast={podcast}
                onEdit={onEdit}
              />
            ))}
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


export default function ArtistList({ podcasts }: { podcasts: Podcast[] }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const artists = useMemo(() => {
    const artistMap = new Map<string, Podcast[]>();
    podcasts.forEach((podcast) => {
      podcast.artist.forEach((artist) => {
        if (!artistMap.has(artist)) {
          artistMap.set(artist, []);
        }
        artistMap.get(artist)!.push(podcast);
      });
    });
    return Array.from(artistMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [podcasts]);

  const filteredArtists = useMemo(() => {
    if (!searchTerm) {
      return artists;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return artists.filter(([artistName]) =>
      artistName.toLowerCase().includes(lowercasedFilter),
    );
  }, [artists, searchTerm]);


  const handleEdit = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setIsFormOpen(true);
  };
  
  return (
    <div className="space-y-4">
       <Input
        placeholder="আর্টিস্ট খুঁজুন..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full max-w-sm"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredArtists.map(([artist, artistPodcasts]) => (
          <Sheet key={artist}>
            <SheetTrigger asChild>
               <Card className="cursor-pointer transition-all hover:bg-muted">
                <CardHeader>
                  <CardTitle>{artist}</CardTitle>
                  <CardDescription>{artistPodcasts.length} audio(s)</CardDescription>
                </CardHeader>
              </Card>
            </SheetTrigger>
            <ArtistDetailSheet 
              artistName={artist}
              podcasts={artistPodcasts}
              onEdit={handleEdit}
            />
          </Sheet>
        ))}
      </div>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
         <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Audio</DialogTitle>
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

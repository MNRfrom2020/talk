
"use client";

import { useMemo, useState } from "react";
import type { Podcast } from "@/lib/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import AudioForm from "./AudioForm";
import AudioCard from "./AudioCard";
import { Input } from "@/components/ui/input";

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
    return artists.filter(([artistName, artistPodcasts]) =>
      artistName.toLowerCase().includes(lowercasedFilter) ||
      artistPodcasts.some(p => p.title.toLowerCase().includes(lowercasedFilter))
    );
  }, [artists, searchTerm]);


  const handleEdit = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setIsFormOpen(true);
  };
  
  return (
    <div className="space-y-4">
       <Input
        placeholder="আর্টিস্ট বা অডিও খুঁজুন..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full md:max-w-sm"
      />
      <Accordion type="single" collapsible className="w-full">
        {filteredArtists.map(([artist, artistPodcasts]) => (
          <AccordionItem value={artist} key={artist}>
            <AccordionTrigger>
              {artist} ({artistPodcasts.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {artistPodcasts.map((podcast) => (
                  <AudioCard
                    key={podcast.id}
                    podcast={podcast}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
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

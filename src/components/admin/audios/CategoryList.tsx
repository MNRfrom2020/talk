
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

export default function CategoryList({ podcasts }: { podcasts: Podcast[] }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const categories = useMemo(() => {
    const categoryMap = new Map<string, Podcast[]>();
    podcasts.forEach((podcast) => {
      podcast.categories.forEach((category) => {
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(podcast);
      });
    });
    return Array.from(categoryMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [podcasts]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) {
      return categories;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return categories.filter(([categoryName, categoryPodcasts]) =>
      categoryName.toLowerCase().includes(lowercasedFilter) ||
      categoryPodcasts.some(p => p.title.toLowerCase().includes(lowercasedFilter))
    );
  }, [categories, searchTerm]);

  const handleEdit = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setIsFormOpen(true);
  };
  
  return (
    <div className="space-y-4">
       <Input
        placeholder="ক্যাটাগরি বা অডিও খুঁজুন..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full md:max-w-sm"
      />
      <Accordion type="single" collapsible className="w-full">
        {filteredCategories.map(([category, categoryPodcasts]) => (
          <AccordionItem value={category} key={category}>
            <AccordionTrigger>
              {category} ({categoryPodcasts.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categoryPodcasts.map((podcast) => (
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

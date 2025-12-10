
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


interface CategoryDetailSheetProps {
  categoryName: string;
  podcasts: Podcast[];
  onEdit: (podcast: Podcast) => void;
}

const CategoryDetailSheet = ({ categoryName, podcasts, onEdit }: CategoryDetailSheetProps) => {
  return (
    <SheetContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
      <SheetHeader>
        <SheetTitle>{categoryName}</SheetTitle>
      </SheetHeader>
      <ScrollArea className="h-[calc(100vh-4rem)] pr-6">
         <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
            {podcasts.map((podcast) => (
              <AudioCard
                key={podcast.id}
                podcast={podcast}
                onEdit={onEdit}
              />
            ))}
          </div>
      </ScrollArea>
    </SheetContent>
  )
}


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
    return Array.from(categoryMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [podcasts]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) {
      return categories;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return categories.filter(([categoryName]) =>
      categoryName.toLowerCase().includes(lowercasedFilter),
    );
  }, [categories, searchTerm]);

  const handleEdit = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="ক্যাটাগরি খুঁজুন..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full md:max-w-sm"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredCategories.map(([category, categoryPodcasts]) => (
           <Sheet key={category}>
            <SheetTrigger asChild>
               <Card className="cursor-pointer transition-all hover:bg-muted">
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                  <CardDescription>{categoryPodcasts.length} audio(s)</CardDescription>
                </CardHeader>
              </Card>
            </SheetTrigger>
            <CategoryDetailSheet 
              categoryName={category}
              podcasts={categoryPodcasts}
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

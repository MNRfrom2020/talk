

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";

import { Button } from "@admin/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@admin/components/ui/form";
import { Input } from "@admin/components/ui/input";
import { useToast } from "@admin/hooks/use-toast";
import { createPodcast, updatePodcast } from "@admin/lib/actions";
import type { Artist, Category, Podcast } from "@admin/lib/types";
import { ScrollArea } from "@admin/components/ui/scroll-area";
import { Checkbox } from "@admin/components/ui/checkbox";

const PodcastFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  artist_uuids: z.array(z.string()).min(1, "Artist is required"),
  category_uuids: z.array(z.string()).min(1, "Categories are required"),
  cover_art: z.string().url("Must be a valid URL"),
  cover_art_hint: z.string().optional().or(z.literal("")),
  audio_url: z.string().url("Must be a valid URL"),
  created_at: z.string().optional(),
});

type PodcastFormValues = z.infer<typeof PodcastFormSchema>;

interface AudioFormProps {
  podcast: Podcast | null;
  artists: Artist[];
  categories: Category[];
  onClose: () => void;
}

export default function AudioForm({ podcast, artists, categories, onClose }: AudioFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [artistSearch, setArtistSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  const getFormattedDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = parseISO(dateString);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    } catch (error) {
      return "";
    }
  };

  const defaultValues = {
      id: podcast?.id || undefined,
      title: podcast?.title || "",
      artist_uuids: podcast?.artist_uuids || [],
      category_uuids: podcast?.category_uuids || [],
      cover_art: podcast?.coverArt || "",
      cover_art_hint: podcast?.coverArtHint || "",
      audio_url: podcast?.audioUrl || "",
      created_at: getFormattedDate(podcast?.created_at),
    };

  const form = useForm<PodcastFormValues>({
    resolver: zodResolver(PodcastFormSchema),
    defaultValues,
  });
  
  const { formState: { dirtyFields } } = form;

  useEffect(() => {
    form.reset(defaultValues);
  }, [podcast, form]);


  async function onSubmit(values: PodcastFormValues) {
    setIsSubmitting(true);
    
    let result;
    if (podcast?.id) {
       const changedValues: Partial<PodcastFormValues> = Object.keys(dirtyFields).reduce((acc, key) => {
        const fieldKey = key as keyof PodcastFormValues;
        if (dirtyFields[fieldKey]) {
            (acc as any)[fieldKey] = values[fieldKey];
        }
        return acc;
      }, {});
      
      if (Object.keys(changedValues).length === 0) {
        toast({ title: "No Changes", description: "You haven't changed any fields." });
        setIsSubmitting(false);
        return;
      }
      
      result = await updatePodcast(podcast.id, changedValues);
    } else {
      result = await createPodcast(values);
    }

    setIsSubmitting(false);

    if (result.message) {
      if (result.errors) {
        toast({
          variant: "destructive",
          title: "Error saving podcast",
          description: result.message,
        });
      } else {
        toast({
          title: "Success",
          description: result.message,
        });
        onClose();
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="artist_uuids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Artist(s)</FormLabel>
              <Input
                placeholder="Search artists..."
                value={artistSearch}
                onChange={(e) => setArtistSearch(e.target.value)}
              />
              <ScrollArea className="h-40 rounded-md border p-2">
                <div className="space-y-2">
                  {artists
                    .filter((artist) =>
                      artist.name.toLowerCase().includes(artistSearch.toLowerCase()),
                    )
                    .map((artist) => (
                      <label
                        key={artist.uuid}
                        className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                      >
                        <Checkbox
                          checked={field.value?.includes(artist.uuid)}
                          onCheckedChange={(checked) =>
                            checked
                              ? field.onChange([...(field.value || []), artist.uuid])
                              : field.onChange(
                                  (field.value || []).filter((value) => value !== artist.uuid),
                                )
                          }
                        />
                        <span className="text-sm">{artist.name}</span>
                      </label>
                    ))}
                </div>
              </ScrollArea>
              <FormDescription>
                Select linked artists from the `artists` table.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category_uuids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categories</FormLabel>
              <Input
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
              />
              <ScrollArea className="h-40 rounded-md border p-2">
                <div className="space-y-2">
                  {categories
                    .filter((category) =>
                      category.name.toLowerCase().includes(categorySearch.toLowerCase()),
                    )
                    .map((category) => (
                      <label
                        key={category.uuid}
                        className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                      >
                        <Checkbox
                          checked={field.value?.includes(category.uuid)}
                          onCheckedChange={(checked) =>
                            checked
                              ? field.onChange([...(field.value || []), category.uuid])
                              : field.onChange(
                                  (field.value || []).filter((value) => value !== category.uuid),
                                )
                          }
                        />
                        <span className="text-sm">{category.name}</span>
                      </label>
                    ))}
                </div>
              </ScrollArea>
              <FormDescription>
                Select linked categories from the `categories` table.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cover_art"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Art URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/image.png" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cover_art_hint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Art Hint</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 'abstract design'" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="audio_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Audio URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/audio.mp3" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="created_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Created At</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormDescription>
                This field is for display and sorting. It does not change automatically on edit.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : (podcast ? "Update" : "Save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

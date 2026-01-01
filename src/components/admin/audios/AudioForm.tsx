
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { savePodcast } from "@/lib/actions";
import type { Podcast } from "@/lib/types";

const PodcastFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  artist: z.string().min(1, "Artist is required"),
  categories: z.string().min(1, "Categories are required"),
  cover_art: z.string().url("Must be a valid URL"),
  cover_art_hint: z.string().optional().or(z.literal("")),
  audio_url: z.string().url("Must be a valid URL"),
  created_at: z.string().optional(),
});

type PodcastFormValues = z.infer<typeof PodcastFormSchema>;

interface AudioFormProps {
  podcast: Podcast | null;
  onClose: () => void;
}

export default function AudioForm({ podcast, onClose }: AudioFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getFormattedDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = parseISO(dateString);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    } catch (error) {
      return "";
    }
  };

  const form = useForm<PodcastFormValues>({
    resolver: zodResolver(PodcastFormSchema),
    defaultValues: {
      id: podcast?.id || undefined,
      title: podcast?.title || "",
      artist: Array.isArray(podcast?.artist) ? podcast.artist.join(", ") : "",
      categories: Array.isArray(podcast?.categories) ? podcast.categories.join(", ") : "",
      cover_art: podcast?.coverArt || "",
      cover_art_hint: podcast?.coverArtHint || "",
      audio_url: podcast?.audioUrl || "",
      created_at: getFormattedDate(podcast?.created_at),
    },
  });

  async function onSubmit(values: PodcastFormValues) {
    setIsSubmitting(true);
    const result = await savePodcast(values);
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
          name="artist"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Artist(s)</FormLabel>
              <FormControl>
                <Input placeholder="Artist one, Artist two" {...field} />
              </FormControl>
              <FormDescription>
                Separate multiple artists with a comma.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="categories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categories</FormLabel>
              <FormControl>
                <Input placeholder="Category one, Category two" {...field} />
              </FormControl>
              <FormDescription>
                Separate multiple categories with a comma.
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

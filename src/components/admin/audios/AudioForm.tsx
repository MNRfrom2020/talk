
"use client";

import { useForm, useFormState } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useFormState as useActionFormState } from "react-dom";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { savePodcast, type PodcastState } from "@/lib/actions";
import type { Podcast } from "@/lib/types";

const PodcastFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  artist: z.string().min(1, "Artist is required"),
  categories: z.string().min(1, "Categories are required"),
  cover_art: z.string().url("Must be a valid URL"),
  cover_art_hint: z.string().optional(),
  audio_url: z.string().url("Must be a valid URL"),
});

type PodcastFormValues = z.infer<typeof PodcastFormSchema>;

interface AudioFormProps {
  podcast: Podcast | null;
  onClose: () => void;
}

const SubmitButton = () => {
    const { pending } = useActionFormState(savePodcast, { message: null, errors: {} });
    return (
        <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
        </Button>
    );
};


export default function AudioForm({ podcast, onClose }: AudioFormProps) {
  const { toast } = useToast();
  const initialState: PodcastState = { message: null, errors: {} };
  const [state, dispatch] = useActionFormState(savePodcast, initialState);

  const form = useForm<PodcastFormValues>({
    resolver: zodResolver(PodcastFormSchema),
    defaultValues: {
      id: podcast?.id || undefined,
      title: podcast?.title || "",
      artist: podcast?.artist.join(", ") || "",
      categories: podcast?.categories.join(", ") || "",
      cover_art: podcast?.coverArt || "",
      cover_art_hint: podcast?.coverArtHint || "",
      audio_url: podcast?.audioUrl || "",
    },
  });

  useEffect(() => {
    if (state.message) {
      if (state.errors && Object.keys(state.errors).length > 0) {
        toast({
          variant: "destructive",
          title: "Error saving podcast",
          description: state.message,
        });
      } else {
        toast({
          title: "Success",
          description: state.message,
        });
        onClose();
      }
    }
  }, [state, toast, onClose]);

  return (
    <Form {...form}>
      <form action={dispatch} className="space-y-4">
        {podcast && <input type="hidden" name="id" value={podcast.id} />}
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
        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <SubmitButton />
        </div>
      </form>
    </Form>
  );
}


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
import { savePlaylist } from "@/lib/actions";
import type { Playlist } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";

const PlaylistFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  podcast_ids: z.string().min(1, "At least one Podcast ID is required"),
  cover: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  created_at: z.string().optional(),
});

type PlaylistFormValues = z.infer<typeof PlaylistFormSchema>;

interface PlaylistFormProps {
  playlist: Playlist | null;
  onClose: () => void;
}

export default function PlaylistForm({ playlist, onClose }: PlaylistFormProps) {
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

  const form = useForm<PlaylistFormValues>({
    resolver: zodResolver(PlaylistFormSchema),
    defaultValues: {
      id: playlist?.id || undefined,
      name: playlist?.name || "",
      podcast_ids: Array.isArray(playlist?.podcast_ids)
        ? playlist.podcast_ids.join(", ")
        : "",
      cover: playlist?.cover || "",
      created_at: getFormattedDate(playlist?.created_at),
    },
  });

  async function onSubmit(values: PlaylistFormValues) {
    setIsSubmitting(true);
    const result = await savePlaylist(values);
    setIsSubmitting(false);

    if (result.message) {
      if (result.errors) {
        toast({
          variant: "destructive",
          title: "Error saving playlist",
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter playlist name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="podcast_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Podcast IDs</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="id1, id2, id3"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Comma-separated list of podcast IDs.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cover"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Image URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/cover.png" {...field} />
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
                Leave blank to use the current time.
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
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

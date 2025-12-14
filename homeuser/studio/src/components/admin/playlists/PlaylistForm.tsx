
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
import { savePlaylist, saveUserPlaylist } from "@/lib/actions";
import type { Playlist, Podcast } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

const PlaylistFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  podcast_ids: z.array(z.string()).min(0, "Select at least one podcast").optional(),
  cover: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  created_at: z.string().optional(),
});

type PlaylistFormValues = z.infer<typeof PlaylistFormSchema>;

interface PlaylistFormProps {
  playlist: Playlist | null;
  allPodcasts: Podcast[];
  onClose: () => void;
}

export default function PlaylistForm({
  playlist,
  allPodcasts,
  onClose,
}: PlaylistFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
        ? playlist.podcast_ids
        : [],
      cover: playlist?.cover || "",
      created_at: getFormattedDate(playlist?.created_at),
    },
  });

  const filteredPodcasts = useMemo(() => {
    return allPodcasts.filter(
      (p) =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(p.artist) && p.artist.join(", ").toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [allPodcasts, searchTerm]);

  async function onSubmit(values: PlaylistFormValues) {
    setIsSubmitting(true);
    
    const isUserPlaylist = !!playlist?.user_uid;
    const action = isUserPlaylist ? saveUserPlaylist : savePlaylist;
    
    const payload: any = { ...values };
    if (isUserPlaylist) {
        payload.user_uid = playlist.user_uid;
    }

    const result = await action(payload);
    setIsSubmitting(false);

    if (result.message) {
      if (result.errors) {
        toast({
          variant: "destructive",
          title: `Error saving ${isUserPlaylist ? 'user' : 'system'} playlist`,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
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
              name="cover"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/cover.png"
                      {...field}
                    />
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
          </div>

          <div className="space-y-4">
            <FormItem>
              <FormLabel>Select Podcasts</FormLabel>
              <Input
                placeholder="Search audios by title or artist..."
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
              />
              <FormField
                control={form.control}
                name="podcast_ids"
                render={({ field }) => (
                  <ScrollArea className="h-72 rounded-md border p-2">
                    <div className="space-y-2">
                      {filteredPodcasts.map((podcast) => (
                        <div
                          key={podcast.id}
                          className="flex items-center space-x-3 rounded-md p-2 hover:bg-muted"
                        >
                          <Checkbox
                            id={`podcast-${podcast.id}`}
                            checked={field.value?.includes(podcast.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([
                                    ...(field.value || []),
                                    podcast.id,
                                  ])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== podcast.id,
                                    ),
                                  );
                            }}
                          />
                          <label
                            htmlFor={`podcast-${podcast.id}`}
                            className="flex flex-1 cursor-pointer items-center gap-3 text-sm"
                          >
                            <Image
                              src={podcast.coverArt}
                              alt={podcast.title}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-md object-cover"
                            />
                            <div className="overflow-hidden">
                              <p className="truncate font-medium">
                                {podcast.title}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {Array.isArray(podcast.artist) ? podcast.artist.join(", ") : podcast.artist}
                              </p>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              />
              <FormMessage>
                {form.formState.errors.podcast_ids?.message}
              </FormMessage>
            </FormItem>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
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

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { usePodcast } from "@/context/PodcastContext";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  artist: z
    .string()
    .min(2, { message: "Artist must be at least 2 characters." }),
  categories: z.string().min(1, { message: "Please enter at least one category." }),
});

export function AddPodcastDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { addPodcast } = usePodcast();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      title: "",
      artist: "",
      categories: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    addPodcast({
      title: values.title,
      artist: values.artist,
      categories: values.categories.split(",").map((c) => c.trim()),
      audioUrl: values.url,
      coverArt: `https://picsum.photos/seed/${Date.now()}/500/500`,
      coverArtHint: "podcast cover",
    });
    form.reset();
    setOpen(false);
    toast({
      title: "Podcast Added",
      description: `${values.title} has been added to your library.`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Podcast</DialogTitle>
          <DialogDescription>
            Add a new podcast to your library by providing a link to an audio
            file.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Audio URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/podcast.mp3"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Podcast" {...field} />
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
                  <FormLabel>Artist / Show</FormLabel>
                  <FormControl>
                    <Input placeholder="The Podcaster" {...field} />
                  </FormControl>
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
                    <Input placeholder="Mystery, Thriller" {...field} />
                  </FormControl>
                   <p className="text-xs text-muted-foreground">
                    Enter comma-separated categories.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Add to Library</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

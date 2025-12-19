"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode, useEffect } from "react";
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
import { usePlaylist } from "@/context/PlaylistContext";
import { useToast } from "@/hooks/use-toast";
import type { Playlist } from "@/lib/types";

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Playlist name must be at least 2 characters." }),
  cover: z.string().url("Must be a valid URL.").optional().or(z.literal("")),
});

export function EditPlaylistDialog({
  children,
  playlist,
}: {
  children: ReactNode;
  playlist: Playlist;
}) {
  const [open, setOpen] = useState(false);
  const { updatePlaylist } = usePlaylist();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: playlist.name,
      cover: playlist.cover || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: playlist.name,
        cover: playlist.cover || "",
      });
    }
  }, [open, playlist, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await updatePlaylist(playlist.id, values);
      setOpen(false);
      toast({
        title: "Playlist Updated",
        description: `"${values.name}" has been updated.`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: e.message || "Could not update playlist.",
      });
    }
  }
  
  // Create a unique ID for the form
  const formId = `edit-playlist-form-${playlist.id}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit playlist</DialogTitle>
          <DialogDescription>
            Update the name and cover image for your playlist.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Playlist Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Playlist" {...field} />
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
                  <FormLabel>Cover URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/image.png"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

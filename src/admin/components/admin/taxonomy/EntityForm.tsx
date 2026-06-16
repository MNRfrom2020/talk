import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";

import { Button } from "@admin/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@admin/components/ui/form";
import { Input } from "@admin/components/ui/input";
import { saveArtist, saveCategory } from "@admin/lib/actions";
import type { Artist, Category } from "@admin/lib/types";
import { useToast } from "@admin/hooks/use-toast";

const EntityFormSchema = z.object({
  uuid: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().or(z.literal("")),
  image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  created_at: z.string().optional(),
});

type EntityFormValues = z.infer<typeof EntityFormSchema>;

interface EntityFormProps {
  entity: Artist | Category | null;
  type: "artist" | "category";
  onClose: () => void;
}

export default function EntityForm({ entity, type, onClose }: EntityFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EntityFormValues>({
    resolver: zodResolver(EntityFormSchema),
    defaultValues: {
      uuid: entity?.uuid,
      name: entity?.name || "",
      description: entity?.description || "",
      image_url: entity?.image_url || "",
      created_at: entity?.created_at ? format(parseISO(entity.created_at), "yyyy-MM-dd'T'HH:mm") : "",
    },
  });

  useEffect(() => {
    form.reset({
      uuid: entity?.uuid,
      name: entity?.name || "",
      description: entity?.description || "",
      image_url: entity?.image_url || "",
      created_at: entity?.created_at ? format(parseISO(entity.created_at), "yyyy-MM-dd'T'HH:mm") : "",
    });
  }, [entity, form]);

  const saveAction = type === "artist" ? saveArtist : saveCategory;

  async function onSubmit(values: EntityFormValues) {
    setIsSubmitting(true);
    const result = await saveAction(values as any);
    setIsSubmitting(false);

    if (result.errors) {
      toast({ variant: "destructive", title: "Save failed", description: result.message || "Could not save." });
      return;
    }

    toast({ title: "Saved", description: result.message || "Saved successfully." });
    onClose();
    window.location.reload();
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
                <Input {...field} placeholder={`Enter ${type} name`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Optional description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://example.com/image.png" />
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
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
        </div>
      </form>
    </Form>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";

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
import { saveUser } from "@/lib/actions";
import type { User } from "@/lib/types";

const UserFormSchema = z.object({
  uid: z.string().uuid().optional(),
  full_name: z.string().min(1, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  pass: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
});

type UserFormValues = z.infer<typeof UserFormSchema>;

interface UserFormProps {
  user: User | null;
  onClose: () => void;
}

export default function UserForm({ user, onClose }: UserFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(UserFormSchema),
    defaultValues: {
      uid: user?.uid || undefined,
      full_name: user?.full_name || "",
      username: user?.username || "",
      email: user?.email || "",
      image: user?.image || "",
      pass: "",
    },
  });

  async function onSubmit(values: UserFormValues) {
    setIsSubmitting(true);
    const result = await saveUser(values);
    setIsSubmitting(false);

    if (result.message) {
      if (result.errors) {
        toast({
          variant: "destructive",
          title: "Error saving user",
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
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="pass"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter password" {...field} />
              </FormControl>
              <FormDescription>
                {user ? "Leave blank to keep current password." : "Must be at least 6 characters."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com/avatar.png"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save User"}
          </Button>
        </div>
      </form>
    </Form>
  );
}


"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";

const formSchema = z.object({
  identifier: z.string().min(1, { message: "ইউজারনেম অথবা ইমেইল আবশ্যক।" }),
  password: z.string().min(1, { message: "পাসওয়ার্ড আবশ্যক।" }),
});

export function LoginDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { login } = useUser();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await login(values.identifier, values.password);
      setOpen(false);
      toast({
        title: "লগইন সফল হয়েছে",
        description: "আপনাকে স্বাগতম!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "লগইন ব্যর্থ হয়েছে",
        description: error.message || "একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>লগইন করুন</DialogTitle>
          <DialogDescription>
            দু:খিত, নতুন একাউন্ট তৈরির কোনো অপশন নেই। অনুগ্রহ করে আপনার গেস্ট একাউন্টই ব্যবহার চালিয়ে যান। জাযাকাল্লাহু খাইরান।
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id="login-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ইউজারনেম বা ইমেইল</FormLabel>
                  <FormControl>
                    <Input placeholder="username or email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>পাসওয়ার্ড</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" form="login-form" disabled={form.formState.isSubmitting}>
             {form.formState.isSubmitting ? "লগইন করা হচ্ছে..." : "লগইন করুন"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

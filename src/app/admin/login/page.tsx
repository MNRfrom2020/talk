"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const formSchema = z.object({
  username: z.string().min(1, { message: "ইউজারনেম আবশ্যক।" }),
  password: z.string().min(1, { message: "পাসওয়ার্ড আবশ্যক।" }),
});

export default function AdminLoginPage() {
  const { signIn, admin, loading } = useAdminAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!loading && admin) {
      router.push("/admin/dashboard");
    }
  }, [admin, loading, router]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await signIn(values.username, values.password);
      toast({
        title: "লগইন সফল হয়েছে",
        description: "আপনাকে ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...",
      });
      router.push("/admin/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "লগইন ব্যর্থ হয়েছে",
        description: error.message || "একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।",
      });
    }
  }
  
  if (loading || admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">অ্যাডমিন লগইন</CardTitle>
          <CardDescription>
            আপনার ইউজারনেম এবং পাসওয়ার্ড দিয়ে লগইন করুন।
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ইউজারনেম</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" {...field} />
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
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "লগইন করা হচ্ছে..." : "লগইন করুন"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

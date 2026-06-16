
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAdminAuth } from "@admin/context/AdminAuthContext";
import { Button } from "@admin/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@admin/components/ui/form";
import { Input } from "@admin/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@admin/components/ui/card";
import { useToast } from "@admin/hooks/use-toast";
import { useEffect, useState } from "react";
import { startMnrIdLogin } from "@/lib/mnr-auth";
import { LogIn, KeyRound } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@admin/components/ui/collapsible";

const formSchema = z.object({
  username: z.string().min(1, { message: "ইউজারনেম আবশ্যক।" }),
  password: z.string().min(1, { message: "পাসওয়ার্ড আবশ্যক।" }),
});

export default function AdminLoginPage() {
  const { signIn, admin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showManualLogin, setShowManualLogin] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!loading && admin) {
      navigate("/antro/admin/dashboard");
    }
  }, [admin, loading, navigate]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await signIn(values.username, values.password);
      toast({
        title: "লগইন সফল হয়েছে",
        description: "আপনাকে ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...",
      });
      navigate("/antro/admin/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "লগইন ব্যর্থ হয়েছে",
        description: error.message || "একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।",
      });
    }
  }

  const handleMNRIAuth = () => {
    startMnrIdLogin();
  };
  
  if (loading || admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 px-4">
      <Card className="w-full max-w-sm border-none shadow-xl">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-3xl font-extrabold tracking-tight">Admin Portal</CardTitle>
          <CardDescription className="text-sm">
            Access restricted to authorized personnel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          <div className="space-y-4">
            <Button
              onClick={handleMNRIAuth}
              className="w-full h-12 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <LogIn className="w-5 h-5" />
              Continue with MNR ID
            </Button>
            
            <p className="text-center text-xs text-muted-foreground px-4 italic">
              Access will be granted only to users with Super Admin privileges.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted-foreground/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Collapsible open={showManualLogin} onOpenChange={setShowManualLogin} className="w-full">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:bg-transparent">
                <KeyRound className="w-3 h-3 mr-2" />
                Internal Access
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Username" {...field} className="h-10 text-sm" />
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
                        <FormControl>
                          <Input type="password" placeholder="Password" {...field} className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-10 text-sm" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Authenticating..." : "Login"}
                  </Button>
                </form>
              </Form>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}


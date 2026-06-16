import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeCodeForUser } from "@/lib/mnr-auth";
import { useUser } from "@/context/UserContext";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithMnrId } = useUser();
  const [error, setError] = useState<string | null>(null);
  const hasRefed = useRef(false);

  useEffect(() => {
    if (hasRefed.current) return;
    hasRefed.current = true;

    async function handleCallback() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const errorParam = searchParams.get("error");

      // Handle explicit denial from MNR ID
      if (errorParam === "access_denied") {
        setError("আপনি লগইন বাতিল করেছেন। অনুগ্রহ করে আবার চেষ্টা করুন।");
        return;
      }

      if (!code || !state) {
        setError("অবৈধ callback — প্রয়োজনীয় প্যারামিটার নেই।");
        return;
      }

      try {
        const mnrUser = await exchangeCodeForUser(code, state);
        
        // 🚀 Login immediately, sync happens in background
        loginWithMnrId(mnrUser);
        
        navigate("/", { replace: true });
      } catch (err: any) {
        console.error("MNR ID callback error:", err);
        // Parse error message if it's a string
        let errorMessage = "লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।";
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err?.message) {
          errorMessage = err.message;
        } else if (err?.error) {
          errorMessage = err.error;
        }
        setError(errorMessage);
      }
    }

    handleCallback();
  }, [searchParams, loginWithMnrId, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-secondary/30">
        <div className="w-full max-w-sm space-y-4">
          <Alert variant="destructive" className="border-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>লগইন ব্যর্থ হয়েছে</AlertTitle>
            <AlertDescription className="mt-2">{error}</AlertDescription>
          </Alert>
          <Button
            className="w-full py-6 text-lg hover:scale-[1.02] transition-transform"
            variant="outline"
            onClick={() => navigate("/login", { replace: true })}
          >
            লগইন পেজে ফিরুন
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="relative">
        <Loader2 className="h-16 w-16 animate-spin text-primary opacity-20" />
        <Loader2 className="absolute inset-0 h-16 w-16 animate-spin text-primary [animation-delay:-0.3s]" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-xl font-medium">MNR ID যাচাই করা হচ্ছে</p>
        <p className="text-sm text-muted-foreground animate-pulse">অনুগ্রহ করে অপেক্ষা করুন...</p>
      </div>
    </div>
  );
}

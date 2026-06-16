import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProfileDialog } from "./ProfileDialog";
import { User } from "lucide-react";
import { startMnrIdLogin } from "@/lib/mnr-auth";
import { Separator } from "@/components/ui/separator";

export function LoginOptionsDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const handleMnrIdLogin = () => {
    setOpen(false);
    startMnrIdLogin();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">লগইন করুন</DialogTitle>
          <DialogDescription className="text-center">
            আপনার পছন্দের পদ্ধতিতে লগইন করুন।
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          {/* MNR ID (Primary) */}
          <Button
            onClick={handleMnrIdLogin}
            className="w-full justify-start gap-3 bg-primary hover:bg-primary/90"
          >
            {/* MNR ID Logo Mark */}
            <span className="flex h-5 w-5 items-center justify-center rounded-full overflow-hidden">
              <img src="/mnr.svg" alt="MNR" className="h-full w-full object-contain" />
            </span>
            Continue with MNR ID
          </Button>

          {/* Or Divider */}
          <div className="relative flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">অথবা</span>
            <Separator className="flex-1" />
          </div>

          {/* Guest */}
          <ProfileDialog>
            <Button variant="outline" className="w-full justify-start border-muted-foreground/20">
              <User className="mr-2 h-4 w-4" />
              গেস্ট হিসেবে চালিয়ে যান
            </Button>
          </ProfileDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}

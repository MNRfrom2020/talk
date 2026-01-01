
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { User, LogIn } from "lucide-react";

export function LoginOptionsDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleProperLogin = () => {
    setOpen(false);
    router.push("/login");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">Choose Login Method</DialogTitle>
          <DialogDescription className="text-center">
            Log in with your account or continue as a guest.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <ProfileDialog>
            <Button variant="outline" className="w-full justify-start">
              <User className="mr-2 h-4 w-4" />
              Log in as Guest
            </Button>
          </ProfileDialog>
          <Button onClick={handleProperLogin} className="w-full justify-start">
            <LogIn className="mr-2 h-4 w-4" />
            Proper Login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

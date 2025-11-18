
"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export function DisclaimerDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Disclaimer</DialogTitle>
          <DialogDescription>
            এখানে ব্যবহৃত সব অডিও শুধুমাত্র দাওয়াহ ও শিক্ষামূলক উদ্দেশ্যে
            অন্তর্ভুক্ত করা হয়েছে। কতৃপক্ষের কোনো কপিরাইট সংক্রান্ত আপত্তি বা
            অসুবিধা থাকলে অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন: mail@mnr.world
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

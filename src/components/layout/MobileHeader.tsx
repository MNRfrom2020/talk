
"use client";

import Link from "next/link";
import { User, Shuffle, Info } from "lucide-react";
import { Button } from "../ui/button";
import { useUser } from "@/context/UserContext";
import { ProfileDialog } from "../auth/ProfileDialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/context/PlayerContext";
import { DisclaimerDialog } from "./DisclaimerDialog";


function UserAvatar({ className }: { className?: string }) {
  const { user } = useUser();
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
      <AvatarFallback>{user.name?.[0].toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export default function MobileHeader() {
  const { user } = useUser();
  const { playRandom } = usePlayer();

  const profileButtonContent = (
     <Button variant="ghost" size="icon" className="rounded-full">
        <UserAvatar />
        <span className="sr-only">Profile</span>
    </Button>
  );
  
  const loginButtonContent = (
     <Button variant="ghost" size="icon" className="rounded-full">
        <User className="h-5 w-5" />
        <span className="sr-only">Login</span>
    </Button>
  );

  return (
    <div className="sticky top-0 z-40 p-2 md:hidden">
      <header className="flex items-center justify-between rounded-full bg-secondary px-2 py-1">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full bg-transparent px-3 py-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 192 171.000002"
            preserveAspectRatio="xMidYMid meet"
            className="h-8 w-8"
          >
            <path
              fill="#f41212"
              d="M149.06 94.19 76.86 94.36l14.84 25.57 98.12-.22-68.58-118.16-19.41 11.26 47.23 81.38Z"
            />
            <path
              fill="#009f0b"
              d="m2.14 50.25 68.58 118.16 19.42-11.26-47.23-81.41 72.2-0.16-14.84-25.57-98.12.22Z"
            />
          </svg>
          <h1 className="text-xl font-bold font-headline">Talks</h1>
        </Link>
        <div className="flex items-center gap-1 rounded-full bg-transparent p-1">
          <DisclaimerDialog>
             <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <Info className="h-5 w-5" />
                <span className="sr-only">Disclaimer</span>
              </Button>
            </DisclaimerDialog>
           <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={playRandom}
          >
            <Shuffle className="h-5 w-5" />
            <span className="sr-only">Surprise Me</span>
          </Button>
          <span className="text-muted-foreground">।</span>
           {user.isLoggedIn ? (
              <Link href="/profile" passHref>
                {profileButtonContent}
              </Link>
            ) : (
              <ProfileDialog>
                {loginButtonContent}
              </ProfileDialog>
            )}
        </div>
      </header>
    </div>
  );
}

import Link from "next/link";
import { User } from "lucide-react";
import { Button } from "../ui/button";

export default function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/50 px-4 py-2 md:hidden">
      <Link href="/" className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
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
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          Disclaimer
        </Button>
        <Button variant="ghost" size="icon">
          <User />
          <span className="sr-only">Login</span>
        </Button>
      </div>
    </header>
  );
}

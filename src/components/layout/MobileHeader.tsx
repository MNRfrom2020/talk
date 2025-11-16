import Link from "next/link";
import { User } from "lucide-react";
import { Button } from "../ui/button";

export default function MobileHeader() {
  return (
    <div className="sticky top-0 z-40 p-2 md:hidden">
      <header className="flex items-center justify-between rounded-full bg-secondary px-2 py-1">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full bg-transparent px-3 py-1"
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
          <Button variant="ghost" size="sm" className="rounded-full">
            Disclaimer
          </Button>
          <span className="text-muted-foreground">।</span>
          <Button variant="ghost" size="icon" className="rounded-full">
            <User />
            <span className="sr-only">Login</span>
          </Button>
        </div>
      </header>
    </div>
  );
}

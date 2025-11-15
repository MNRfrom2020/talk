"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Grid, Home, Library, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchDialog } from "../search/SearchDialog";

export default function BottomNavBar() {
  const pathname = usePathname();
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/80 backdrop-blur-sm md:hidden">
      <div className="grid h-16 grid-cols-4">
        <NavItem
          href="/"
          label="Home"
          icon={Home}
          isActive={pathname === "/"}
        />
        <SearchDialog>
          <button className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <Search className="h-6 w-6" />
            <span>Search</span>
          </button>
        </SearchDialog>
        <NavItem
          href="/categories"
          label="Categories"
          icon={Grid}
          isActive={pathname.startsWith("/categories")}
        />
        <NavItem
          href="/library"
          label="Your Library"
          icon={Library}
          isActive={pathname === "/library"}
        />
      </div>
    </div>
  );
}

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive?: boolean;
}

function NavItem({ href, label, icon: Icon, isActive }: NavItemProps) {
  return (
    <NextLink
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-6 w-6" />
      <span>{label}</span>
    </NextLink>
  );
}
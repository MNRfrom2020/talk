
"use client";

import { usePathname } from "next/navigation";
import { Grid, Home, Library, Search, Shuffle, User, Info } from "lucide-react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SearchDialog } from "../search/SearchDialog";
import { useUser } from "@/context/UserContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/context/PlayerContext";
import { usePodcast } from "@/context/PodcastContext";
import { DisclaimerDialog } from "./DisclaimerDialog";
import { Button } from "../ui/button";
import { LoginOptionsDialog } from "../auth/LoginOptionsDialog";

function UserAvatar({ className }: { className?: string }) {
  const { user } = useUser();
  return (
    <Avatar className={cn("h-6 w-6", className)}>
      <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
      <AvatarFallback>{user.name?.[0].toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { playRandom } = usePlayer();
  const { podcasts } = usePodcast();
  const isProfilePage = pathname === "/profile";

  const loggedInProfileButton = (
     <div className={cn("flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", isProfilePage && "bg-sidebar-accent text-sidebar-accent-foreground")}>
      <UserAvatar />
      <span className="truncate">{user.name}</span>
    </div>
  );

  const loggedOutProfileButton = (
     <div className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
      <Avatar className="h-6 w-6">
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <span className="truncate">Login</span>
    </div>
  )

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
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
          <h1 className="font-headline text-xl font-bold">Talk</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton href="/" isActive={pathname === "/"}>
                <Home />
                Home
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SearchDialog>
                <button className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <Search />
                  <span>Search</span>
                </button>
              </SearchDialog>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton onClick={() => playRandom(podcasts)}>
                <Shuffle />
                Surprise Me
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                href="/categories"
                isActive={pathname.startsWith("/categories") || pathname.startsWith("/artists")}
              >
                <Grid />
                Categories
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                href="/library"
                isActive={pathname === "/library" || pathname.startsWith("/playlists")}
              >
                <Library />
                Your Library
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <DisclaimerDialog>
             <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
              >
                <Info className="mr-2 h-4 w-4" />
                Disclaimer
              </Button>
            </DisclaimerDialog>
          {user.isLoggedIn ? (
            <Link href="/profile" passHref>
              {loggedInProfileButton}
            </Link>
          ) : (
            <LoginOptionsDialog>
              <button className="w-full">{loggedOutProfileButton}</button>
            </LoginOptionsDialog>
          )}
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}

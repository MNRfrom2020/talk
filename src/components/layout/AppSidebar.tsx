
"use client";

import { usePathname } from "next/navigation";
import { Home, Library, Plus, Search, Grid, User } from "lucide-react";
import { AddPodcastDialog } from "../podcasts/AddPodcastDialog";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { SearchDialog } from "../search/SearchDialog";

export default function AppSidebar() {
  const pathname = usePathname();

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
          <h1 className="font-headline text-xl font-bold">Talks</h1>
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
              <SidebarMenuButton
                href="/categories"
                isActive={pathname.startsWith("/categories")}
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
          <AddPodcastDialog>
            <button className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Plus className="h-5 w-5" />
              <span>Add Podcast</span>
            </button>
          </AddPodcastDialog>
          <button className="mt-2 flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <User className="h-5 w-5" />
            <span>Guest Login</span>
          </button>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}

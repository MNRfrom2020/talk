"use client";

import {
  Home,
  Library,
  Plus,
  Podcast as PodcastIcon,
  Search,
  Grid,
} from "lucide-react";
import { AddPodcastDialog } from "../podcasts/AddPodcastDialog";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export default function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <PodcastIcon className="text-primary w-8 h-8" />
          <h1 className="text-xl font-bold font-headline">PodLink</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" isActive>
                <Home />
                Home
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#">
                <Search />
                Search
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#">
                <Grid />
                Categories
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#">
                <Library />
                Your Library
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarContent className="!flex-grow-0">
        <SidebarGroup>
          <AddPodcastDialog>
            <button className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Plus className="w-5 h-5" />
              <span>Add Podcast</span>
            </button>
          </AddPodcastDialog>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

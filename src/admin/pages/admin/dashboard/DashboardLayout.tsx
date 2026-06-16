
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  Home,
  Music,
  ListMusic,
  LayoutGrid,
  MicVocal,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from "@admin/components/ui/sidebar";
import { cn } from "@admin/lib/utils";

const NavItem = ({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
}) => (
  <Link
    to={href}
    className={cn(
      "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
      isActive
        ? "text-primary"
        : "text-muted-foreground hover:text-foreground",
    )}
  >
    <Icon className="h-5 w-5" />
    <span className="text-[10px]">{label}</span>
  </Link>
);

export default function DashboardLayout() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
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
              <h1 className="font-headline text-xl font-bold">Admin</h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/antro/admin/dashboard"}
                >
                  <Link to="/antro/admin/dashboard">
                    <Home />
                    ড্যাশবোর্ড
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/antro/admin/dashboard/audios"}
                >
                  <Link to="/antro/admin/dashboard/audios">
                    <Music />
                    অডিও
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/antro/admin/dashboard/categories"}
                >
                  <Link to="/antro/admin/dashboard/categories">
                    <LayoutGrid />
                    ক্যাটাগরি
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/antro/admin/dashboard/artists"}
                >
                  <Link to="/antro/admin/dashboard/artists">
                    <MicVocal />
                    আর্টিস্ট
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/antro/admin/dashboard/playlists"}
                >
                  <Link to="/antro/admin/dashboard/playlists">
                    <ListMusic />
                    প্লেলিস্ট
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="flex-1 pb-16 md:pb-0">
          <Outlet />
        </SidebarInset>
        <div className="fixed bottom-0 left-0 right-0 z-50 grid h-16 grid-cols-5 border-t border-border/50 bg-card/80 backdrop-blur-sm md:hidden">
          <NavItem
            href="/antro/admin/dashboard"
            label="ড্যাশবোর্ড"
            icon={Home}
            isActive={pathname === "/antro/admin/dashboard"}
          />
          <NavItem
            href="/antro/admin/dashboard/audios"
            label="অডিও"
            icon={Music}
            isActive={pathname === "/antro/admin/dashboard/audios"}
          />
          <NavItem
            href="/antro/admin/dashboard/categories"
            label="ক্যাটাগরি"
            icon={LayoutGrid}
            isActive={pathname === "/antro/admin/dashboard/categories"}
          />
          <NavItem
            href="/antro/admin/dashboard/artists"
            label="আর্টিস্ট"
            icon={MicVocal}
            isActive={pathname === "/antro/admin/dashboard/artists"}
          />
          <NavItem
            href="/antro/admin/dashboard/playlists"
            label="প্লেলিস্ট"
            icon={ListMusic}
            isActive={pathname === "/antro/admin/dashboard/playlists"}
          />
        </div>
      </div>
    </SidebarProvider>
  );
}

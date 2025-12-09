"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Music, Users, LogOut } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NavItem = ({ href, label, icon: Icon, isActive }: { href: string; label: string; icon: React.ElementType; isActive: boolean }) => (
  <Link
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
  </Link>
);


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useAdminAuth();

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
                  href="/admin/dashboard"
                  isActive={pathname === "/admin/dashboard"}
                >
                  <Home />
                  ড্যাশবোর্ড
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  href="/admin/dashboard/audios"
                  isActive={pathname === "/admin/dashboard/audios"}
                >
                  <Music />
                  অডিওসমূহ
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton
                  href="/admin/dashboard/users"
                  isActive={pathname === "/admin/dashboard/users"}
                >
                  <Users />
                  ব্যবহারকারীগণ
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
           <SidebarFooter>
            <Button variant="ghost" onClick={signOut} className="justify-start">
               <LogOut className="mr-2 h-4 w-4"/>
              লগআউট
            </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex-1 pb-16 md:pb-0">{children}</SidebarInset>
         <div className="fixed bottom-0 left-0 right-0 z-50 grid h-16 grid-cols-3 border-t border-border/50 bg-card/80 backdrop-blur-sm md:hidden">
          <NavItem 
            href="/admin/dashboard"
            label="ড্যাশবোর্ড"
            icon={Home}
            isActive={pathname === "/admin/dashboard"}
          />
          <NavItem 
            href="/admin/dashboard/audios"
            label="অডিওসমূহ"
            icon={Music}
            isActive={pathname === "/admin/dashboard/audios"}
          />
           <NavItem 
            href="/admin/dashboard/users"
            label="ব্যবহারকারীগণ"
            icon={Users}
            isActive={pathname === "/admin/dashboard/users"}
          />
        </div>
      </div>
    </SidebarProvider>
  );
}

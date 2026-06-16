import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import AppSidebar from "@/components/layout/AppSidebar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import MobileHeader from "@/components/layout/MobileHeader";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/context/PlayerContext";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

const CategoriesPage = () => {
  const { isExpanded } = usePlayer();
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const meta = await apiClient.get("podcasts.php", { action: "meta" });
        setCategories(meta.categories || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <SidebarProvider>
      <div className="flex h-screen flex-col bg-background">
        <MobileHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <ScrollArea className="h-full w-full [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!w-full">
              <main
                className={cn(
                  "w-full space-y-8 p-4 sm:p-6 lg:p-8",
                  "pb-24 md:pb-8",
                )}
              >
                <hr className="h-10 border-transparent md:hidden" />
                {/* 🚀 Magic Fix: Added className="w-full" here to override Radix's table display shrink */}
                <div className="w-full">
                  <h1 className="font-headline mb-6 text-3xl font-bold tracking-tight">
                    Categories
                  </h1>
                  
                  {isLoading ? (
                    <div className="flex h-48 items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : categories.length > 0 ? (
                    <div className="w-full grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {categories.map((category) => (
                        <Link
                          to={`/categories/${encodeURIComponent(category)}`}
                          key={category}
                          className="w-full"
                        >
                          <Card className="grid h-full min-h-24 w-full place-items-center bg-secondary p-4 text-center font-semibold text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
                            {category}
                          </Card>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center rounded-md border border-dashed">
                      <p className="text-muted-foreground">
                        No categories available.
                      </p>
                    </div>
                  )}
                </div>
                <hr className="h-10 border-transparent md:hidden" />
              </main>
            </ScrollArea>
          </SidebarInset>
        </div>
        <AnimatePresence>
          <Player />
        </AnimatePresence>
        {!isExpanded && <BottomNavBar />}
      </div>
    </SidebarProvider>
  );
};

export default CategoriesPage;
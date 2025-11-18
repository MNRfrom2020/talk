
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence } from "framer-motion";
import { Camera, Clapperboard, Mic, User, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

import AppSidebar from "@/components/layout/AppSidebar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { usePlayer } from "@/context/PlayerContext";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import MobileHeader from "@/components/layout/MobileHeader";
import { cn } from "@/lib/utils";
import ListeningChart from "@/components/podcasts/ListeningChart";
import { usePlaylist } from "@/context/PlaylistContext";
import { usePodcast } from "@/context/PodcastContext";
import CategorySection from "@/components/podcasts/CategorySection";
import { useIsMobile } from "@/hooks/use-mobile";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
});

const StatCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

export default function ProfilePage() {
  const { user, login, logout } = useUser();
  const { history, listeningLog } = usePlayer();
  const { podcasts } = usePodcast();
  const { getPodcastsForPlaylist, FAVORITES_PLAYLIST_ID } = usePlaylist();
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(
    user.avatar,
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const importFileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name,
    },
  });

  const favoritePodcasts = React.useMemo(() =>
    getPodcastsForPlaylist(FAVORITES_PLAYLIST_ID, podcasts),
    [getPodcastsForPlaylist, FAVORITES_PLAYLIST_ID, podcasts]
  );

  const stats = React.useMemo(() => {
    if (history.length === 0) {
      return null;
    }

    const artistCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    history.forEach((podcast) => {
      podcast.artist.forEach(artist => {
        artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
      });

      podcast.categories.forEach((category) => {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });
    });

    const favoriteArtist = [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const favoriteCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    return {
      totalPlayed: history.length,
      favoriteArtist,
      favoriteCategory,
    };
  }, [history]);

  React.useEffect(() => {
    form.reset({ name: user.name });
    setAvatarPreview(user.avatar);
  }, [user, form]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    login(values.name, avatarPreview);
    toast({
      title: "Profile Updated",
      description: "Your changes have been saved.",
    });
  }

  function handleLogout() {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been logged out.",
    });
  }

  const handleExport = () => {
    try {
      const userProfile = localStorage.getItem("guest_user_profile");
      const podcastHistory = localStorage.getItem("podcast_history");
      const podcastPlaylists = localStorage.getItem("podcast_playlists");
      const listeningLog = localStorage.getItem("listening_log");


      const dataToExport = {
        userProfile: userProfile ? JSON.parse(userProfile) : null,
        podcastHistory: podcastHistory ? JSON.parse(podcastHistory) : null,
        podcastPlaylists: podcastPlaylists
          ? JSON.parse(podcastPlaylists)
          : null,
        listeningLog: listeningLog ? JSON.parse(listeningLog) : null,
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(dataToExport, null, 2),
      )}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = "mnr-talks-backup.json";
      link.click();

      toast({
        title: "Data Exported",
        description: "Your data has been successfully exported.",
      });
    } catch (error) {
      console.error("Failed to export data", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "There was an error while exporting your data.",
      });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== "string") {
          throw new Error("File is not a valid text file.");
        }
        const data = JSON.parse(text);

        if (data.userProfile) {
          localStorage.setItem(
            "guest_user_profile",
            JSON.stringify(data.userProfile),
          );
        }
        if (data.podcastHistory) {
          localStorage.setItem(
            "podcast_history",
            JSON.stringify(data.podcastHistory),
          );
        }
        if (data.podcastPlaylists) {
          localStorage.setItem(
            "podcast_playlists",
            JSON.stringify(data.podcastPlaylists),
          );
        }
        if (data.listeningLog) {
           localStorage.setItem(
            "listening_log",
            JSON.stringify(data.listeningLog),
          );
        }

        toast({
          title: "Import Successful",
          description: "Your data has been imported. The app will now reload.",
        });

        // Reload to apply changes from localStorage
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error("Failed to import data", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "The selected file is not valid or is corrupted.",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <SidebarProvider>
       <div className="relative flex h-screen flex-col bg-background">
        <MobileHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col">
            <ScrollArea className="h-full">
              <main
                className={cn(
                  "p-4 sm:p-6 lg:p-8",
                  "pb-24 md:pb-8",
                )}
              >
               <div className="mx-auto max-w-2xl">
                <div className="space-y-8">
                  <h1 className="text-center font-headline text-3xl font-bold tracking-tight">
                    Edit Profile
                  </h1>

                  <div className="flex justify-center">
                    <div className="relative">
                      <Avatar className="h-32 w-32">
                        <AvatarImage
                          src={avatarPreview ?? undefined}
                          alt="User Avatar"
                        />
                        <AvatarFallback>
                          <User className="h-16 w-16" />
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute bottom-1 right-1 rounded-full border-2 border-background"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-5 w-5" />
                        <span className="sr-only">Change avatar</span>
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                    </div>
                  </div>

                  <Form {...form}>
                    <form
                      id="profile-form"
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="w-full space-y-6"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full">
                        Save Changes
                      </Button>
                    </form>
                  </Form>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h2 className="text-center text-lg font-medium">Your Stats</h2>
                    {stats ? (
                       <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <StatCard
                          title="Audio Played"
                          value={stats.totalPlayed.toString()}
                          icon={<Clapperboard className="h-4 w-4 text-muted-foreground" />}
                        />
                        <StatCard
                          title="Favorite Artist"
                          value={stats.favoriteArtist}
                          icon={<Mic className="h-4 w-4 text-muted-foreground" />}
                        />
                        <StatCard
                          title="Top Category"
                          value={stats.favoriteCategory}
                          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                        />
                      </div>
                    ) : (
                      <p className="text-center text-sm text-muted-foreground">Start listening to see your stats here!</p>
                    )}
                  </div>
                  
                  <ListeningChart />

                  {favoritePodcasts.length > 0 && (
                    <>
                      <Separator />
                      <CategorySection
                        title="Favorite Audios"
                        podcasts={favoritePodcasts}
                      />
                    </>
                  )}

                  <Separator />

                  <div className="w-full space-y-4">
                     <h2 className="text-center text-lg font-medium">Data Management</h2>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={handleExport}
                      >
                        Export My Data
                      </Button>
                       <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => importFileInputRef.current?.click()}
                      >
                        Import My Data
                      </Button>
                       <input
                        type="file"
                        ref={importFileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={handleImport}
                      />
                  </div>

                  <Separator />

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </div>
                </div>
              </main>
            </ScrollArea>
          </SidebarInset>
        </div>
        <AnimatePresence>
          <Player />
        </AnimatePresence>
        <BottomNavBar />
      </div>
    </SidebarProvider>
  );
}

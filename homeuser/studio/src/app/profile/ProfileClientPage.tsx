
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence } from "framer-motion";
import { Camera, Clapperboard, Mic, User, TrendingUp, Home } from "lucide-react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";

import AppSidebar from "@/components/layout/AppSidebar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { useUser, type User as UserType } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import MobileHeader from "@/components/layout/MobileHeader";
import { cn } from "@/lib/utils";
import ListeningChart from "@/components/podcasts/ListeningChart";
import { usePlaylist } from "@/context/PlaylistContext";
import CategorySection from "@/components/podcasts/CategorySection";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { saveUser as updateUserInDb } from "@/lib/actions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Podcast } from "@/lib/types";

const userFormSchema = z.object({
  full_name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  image: z.string().url("Must be a valid URL").nullable().or(z.literal("")),
  email: z.string().email("Please enter a valid email address."),
  pass: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
});

const StatCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
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

interface ProfileClientPageProps {
    initialUser: UserType;
    initialStats: {
        totalPlayed: number;
        favoriteArtist: string;
        favoriteCategory: string;
    };
    allPodcasts: Podcast[];
}

export default function ProfileClientPage({ initialUser, initialStats, allPodcasts }: ProfileClientPageProps) {
  const { user, updateUser, logout } = useUser();
  const { isExpanded } = usePlayer();
  const { getPodcastsForPlaylist, FAVORITES_PLAYLIST_ID } = usePlaylist();
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(
    user.avatar,
  );
  const importFileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
          full_name: initialUser.name,
          image: initialUser.avatar,
          email: initialUser.email || "",
          pass: "",
        },
  });

  const favoritePodcasts = React.useMemo(() => {
    if (!FAVORITES_PLAYLIST_ID) return [];
    return getPodcastsForPlaylist(FAVORITES_PLAYLIST_ID, allPodcasts)
  }, [getPodcastsForPlaylist, FAVORITES_PLAYLIST_ID, allPodcasts]);

  React.useEffect(() => {
    form.reset({
        full_name: user.name,
        image: user.avatar,
        email: user.email || "",
        pass: "",
    });
    setAvatarPreview(user.avatar);
  }, [user, form]);


  async function onSubmit(values: any) {
    try {
        if (!user.uid || !user.username) {
            throw new Error("User information is incomplete.");
        }
        await updateUserInDb({
          uid: user.uid,
          username: user.username,
          ...values
        });
        await updateUser({ name: values.full_name, avatar: values.image });

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved.",
      });
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Update Failed",
            description: error.message || "Could not update profile.",
        });
    }
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
      const userProfile = localStorage.getItem("user_profile");
      const podcastHistory = localStorage.getItem("podcast_history");
      const podcastPlaylists = localStorage.getItem("podcast_playlists_guest");
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
            "user_profile",
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
            "podcast_playlists_guest",
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

  const renderUserForm = () => (
    <>
      <FormField
        control={form.control}
        name="full_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full Name</FormLabel>
            <FormControl>
              <Input placeholder="Your full name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="your@email.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={form.control}
        name="image"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Avatar URL</FormLabel>
            <FormControl>
              <Input placeholder="https://example.com/avatar.png" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="pass"
        render={({ field }) => (
          <FormItem>
            <FormLabel>New Password</FormLabel>
            <FormControl>
              <Input type="password" placeholder="Leave blank to keep current" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

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
                  "pb-20 md:pb-8",
                )}
              >
               <div className="mx-auto max-w-2xl">
                <div className="space-y-8">
                  <h1 className="text-center font-headline text-3xl font-bold tracking-tight">
                    Profile
                  </h1>

                  <div className="flex justify-center">
                    <div className="relative">
                      <Avatar className="h-32 w-32">
                        <AvatarImage
                          src={avatarPreview ?? undefined}
                          alt={user.name}
                        />
                        <AvatarFallback>
                          <User className="h-16 w-16" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "w-full justify-between",
                        )}
                      >
                        Edit Profile
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div>
                          <Form {...form}>
                            <form
                              id="profile-form"
                              onSubmit={form.handleSubmit(onSubmit)}
                              className="w-full space-y-6"
                            >
                              {renderUserForm()}
                              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                 {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                              </Button>
                            </form>
                          </Form>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h2 className="text-center text-lg font-medium">Your Stats (Last 30 Days)</h2>
                    {initialStats.totalPlayed > 0 ? (
                       <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <StatCard
                          title="Audio Played"
                          value={initialStats.totalPlayed.toString()}
                          icon={<Clapperboard className="h-4 w-4 text-muted-foreground" />}
                        />
                        <StatCard
                          title="Favorite Artist"
                          value={initialStats.favoriteArtist}
                          icon={<Mic className="h-4 w-4 text-muted-foreground" />}
                        />
                        <StatCard
                          title="Top Category"
                          value={initialStats.favoriteCategory}
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

                  <div className="w-full space-y-4 mb-20 md:mb-0">
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

                  <div className="w-full space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                    {!user.isLoggedIn && (
                        <LoginDialog>
                        <Button variant="outline" className="w-full">
                            Login
                        </Button>
                        </LoginDialog>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="w-full">
                     <Link href="/" passHref>
                        <Button variant="link" className="w-full">
                           <Home className="mr-2 h-4 w-4"/>
                           Go to Homepage
                        </Button>
                     </Link>
                  </div>

                </div>
                </div>
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
}

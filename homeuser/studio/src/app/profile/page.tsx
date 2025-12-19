
"use client";

export const runtime = 'edge';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence } from "framer-motion";
import { Camera, Clapperboard, Mic, User, TrendingUp, Home } from "lucide-react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";


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
import { usePodcast } from "@/context/PodcastContext";
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

const guestFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  avatar: z.string().nullable(),
});

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

export default function ProfilePage() {
  const { user, updateUser, logout, loading: userLoading } = useUser();
  const { isExpanded, history } = usePlayer();
  const { podcasts } = usePodcast();
  const { getPodcastsForPlaylist, FAVORITES_PLAYLIST_ID } = usePlaylist();
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(
    user.avatar,
  );
  const importFileInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();


  const form = useForm({
    resolver: zodResolver(user.isGuest ? guestFormSchema : userFormSchema),
    defaultValues: user.isGuest
      ? { name: user.name, avatar: user.avatar }
      : {
          full_name: user.name,
          image: user.avatar,
          email: user.email || "",
          pass: "",
        },
  });

  const favoritePodcasts = React.useMemo(() => {
    if (!FAVORITES_PLAYLIST_ID) return [];
    return getPodcastsForPlaylist(FAVORITES_PLAYLIST_ID, podcasts)
  }, [getPodcastsForPlaylist, FAVORITES_PLAYLIST_ID, podcasts]);
  
  const stats = React.useMemo(() => {
    if (history.length === 0) {
      return { totalPlayed: 0, favoriteArtist: "N/A", favoriteCategory: "N/A" };
    }

    const artistCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    history.forEach((podcast) => {
      const artists = Array.isArray(podcast.artist) ? podcast.artist : [podcast.artist];
      artists.forEach(artist => {
        if(artist) artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
      });

      podcast.categories.forEach((category) => {
        if(category) categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });
    });

    const favoriteArtist = [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const favoriteCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    return {
      totalPlayed: new Set(history.map(p => p.id)).size,
      favoriteArtist,
      favoriteCategory,
    };
  }, [history]);

  React.useEffect(() => {
    if (user.isGuest) {
        form.reset({ name: user.name, avatar: user.avatar });
    } else {
        form.reset({
            full_name: user.name,
            image: user.avatar,
            email: user.email || "",
            pass: "",
        });
    }
    setAvatarPreview(user.avatar);
  }, [user, form]);
  
   React.useEffect(() => {
    if (!userLoading && !user.isLoggedIn) {
      router.push("/");
    }
  }, [user, userLoading, router]);
  
   const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        if (user.isGuest) {
            form.setValue('avatar', result);
        } else {
            form.setValue('image', result);
        }
      };
      reader.readAsDataURL(file);
    }
  };


  async function onSubmit(values: any) {
    try {
      if (user.isGuest) {
        await updateUser({ name: values.name, avatar: avatarPreview });
      } else {
         if (!user.uid || !user.username) {
            throw new Error("User information is incomplete.");
        }
        await updateUserInDb({
          uid: user.uid,
          username: user.username,
          ...values
        });
        await updateUser({ name: values.full_name, avatar: values.image });
      }
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
    router.push('/');
  }

  const handleExport = () => {
    try {
      const dataToExport: any = {};
      const keysToExport = ["user_profile", "podcast_history", "podcast_playlists_guest", "listening_log"];
      
      keysToExport.forEach(key => {
        const item = localStorage.getItem(key);
        if(item) {
           dataToExport[key] = JSON.parse(item);
        }
      });

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

        Object.keys(data).forEach(key => {
          localStorage.setItem(key, JSON.stringify(data[key]));
        });

        toast({
          title: "Import Successful",
          description: "Your data has been imported. The app will now reload.",
        });

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
  
  const renderGuestForm = () => (
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
  );


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
              <Input 
                placeholder="https://example.com/avatar.png" 
                {...field} 
                value={field.value ?? ""}
                onChange={(e) => {
                  field.onChange(e);
                  setAvatarPreview(e.target.value);
                }}
              />
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
  
  if (userLoading || !user.isLoggedIn) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

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
                       {(user.isGuest) && (
                        <>
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
                        </>
                      )}
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
                               {user.isGuest ? renderGuestForm() : renderUserForm()}
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
                    {stats.totalPlayed > 0 ? (
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
                    <br />
                    {!user.isLoggedIn && (
                        <LoginDialog>
                        <Button variant="outline" className="w-full">
                            Login
                        </Button>
                        </LoginDialog>
                    )}
                  </div>

                  <Separator />

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


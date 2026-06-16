


import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence } from "framer-motion";
import { Camera, Clapperboard, Mic, User, TrendingUp, Home, ExternalLink, Edit3, Check, ChevronDown, ChevronUp } from "lucide-react";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";


import AppSidebar from "@/components/layout/AppSidebar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Player from "@/components/layout/Player";
import PodcastCard from "@/components/podcasts/PodcastCard";
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
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import MobileHeader from "@/components/layout/MobileHeader";
import { cn } from "@/lib/utils";
import ListeningChart from "@/components/podcasts/ListeningChart";
import { usePlaylist } from "@/context/PlaylistContext";
import { usePodcast } from "@/context/PodcastContext";
import { saveUser as updateUserInDb } from "@/lib/actions";
import { useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import RoleBadge from "@/components/RoleBadge";
import GoogleDriveBackupCard from "@/components/profile/GoogleDriveBackupCard";

const hasSuperUserRole = (role?: string | string[]) => {
  const userRoles = Array.isArray(role) ? role : [role || ""];
  return userRoles.some((item) => item.toLowerCase().trim() === "super user");
};

const hasBackupAccessRole = (role?: string | string[]) => {
  const userRoles = Array.isArray(role) ? role : [role || ""];
  return userRoles.some((item) => {
    const normalized = item.toLowerCase().trim();
    return normalized === "subscriber" || normalized === "contributor";
  });
};

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
  const { isExpanded, history, loadListeningHistory } = usePlayer();
  const { podcasts } = usePodcast();
  const { getPodcastsForPlaylist, FAVORITES_PLAYLIST_ID } = usePlaylist();
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(
    user.avatar,
  );
  const importFileInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // 🎯 Load listening history only when Profile page mounts (on-demand)
  useEffect(() => {
    loadListeningHistory();
  }, []);


  const form = useForm<any>({
    resolver: zodResolver(user.isGuest ? guestFormSchema : userFormSchema) as any,
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

  // 🎯 Manage rows display for Favorite Audios
  const [isFavoritesExpanded, setIsFavoritesExpanded] = React.useState(false);
  const [itemsPerRow, setItemsPerRow] = React.useState(2); // Default to mobile (2 cols)

  React.useEffect(() => {
    const handleResize = () => setItemsPerRow(window.innerWidth >= 768 ? 3 : 2);
    handleResize(); // Set initial value
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
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
      navigate("/");
    }
  }, [user, userLoading, navigate]);
  
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
      const needsCloudSync = !!user.uid && hasSuperUserRole(user.role);

      if (user.isGuest) {
        await updateUser({ name: values.name, avatar: avatarPreview });
      } else {
        if (needsCloudSync) {
          if (!user.uid || !user.username) {
            throw new Error("User information is incomplete.");
          }
          await updateUserInDb({
            uid: user.uid,
            username: user.username,
            ...values
          });
        }
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
    navigate('/');
  }

  const handleExport = () => {
    try {
      const dataToExport: any = {};
      const keysToExport = ["user_profile", "podcast_history", "podcast_playlists_guest", "listening_log", "app_theme"];
      
      keysToExport.forEach(key => {
        const item = localStorage.getItem(key);
        if(item) {
           dataToExport[key] = key === "user_profile" || key === "app_theme" ? item : JSON.parse(item);
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
          const value = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
          localStorage.setItem(key, value);
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
                  "pt-20 md:pt-8",
                  "pb-20 md:pb-8",
                )}
              >
               <div className="mx-auto max-w-2xl">
                
                {/* Profile Header Section */}
                <div className="space-y-8">
                  {/* Guest Profile Display */}
                  {user.isGuest ? (
                    <div className="flex flex-col items-center space-y-6">
                      {/* Avatar with Edit Button */}
                      <div className="relative">
                        <div className="relative">
                          <Avatar className="h-36 w-36 ring-4 ring-primary/20 ring-offset-2 ring-offset-background">
                            <AvatarImage
                              src={avatarPreview ?? undefined}
                              alt={user.name}
                            />
                            <AvatarFallback className="bg-primary/10 text-4xl">
                              <User className="h-16 w-16" />
                            </AvatarFallback>
                          </Avatar>
                          {user.isGuest && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                className="absolute bottom-1 right-1 rounded-full border-2 border-background shadow-lg"
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

                      {/* Name Display */}
                      <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">
                          {user.name || user.guest_name}
                        </h1>
                      </div>

                      {/* Edit Profile Button for Guests */}
                      <Accordion type="single" collapsible className="w-full max-w-md">
                        <AccordionItem value="edit-profile">
                          <AccordionTrigger
                            className={cn(
                              buttonVariants({ variant: "outline" }),
                              "w-full justify-between gap-2",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <Edit3 className="h-4 w-4" />
                              Edit Profile
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4">
                            <div>
                              <Form {...form}>
                                <form
                                  id="profile-form"
                                  onSubmit={form.handleSubmit(onSubmit)}
                                  className="w-full space-y-6"
                                >
                                  {renderGuestForm()}
                                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                                  </Button>
                                </form>
                              </Form>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  ) : (
                    /* MNR ID Profile Display */
                    <div className="flex flex-col items-center space-y-6">
                      {/* Avatar */}
                      <div className="relative">
                        <Avatar className="h-36 w-36 ring-4 ring-primary/20 ring-offset-2 ring-offset-background">
                          <AvatarImage
                            src={user.avatar ?? undefined}
                            alt={user.name}
                          />
                          <AvatarFallback className="bg-primary/10 text-4xl">
                            <User className="h-16 w-16" />
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Profile Info */}
                      <div className="text-center space-y-3">
                        {/* Name with Role Badge */}
                        <div className="flex items-center justify-center gap-1">
                          <h1 className="text-3xl font-bold tracking-tight">
                            {user.name}
                          </h1>
                          {user.role && <RoleBadge roles={user.role} />}
                        </div>

                        {/* Username */}
                        {user.username && (
                          <div className="text-muted-foreground text-sm font-medium">
                            @{user.username.toUpperCase()}
                          </div>
                        )}

                        {/* Email */}
                        {user.email && (
                          <div className="text-muted-foreground text-sm">
                            {user.email}
                          </div>
                        )}
                      </div>

                      {/* Edit Profile on MNR ID Button */}
                      <Button
                        variant="outline"
                        className="w-full max-w-md gap-2"
                        onClick={() => window.open("https://id.mnr.bd/dashboard", "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Edit Profile on MNR ID
                      </Button>
                    </div>
                  )}

                  <Separator />

                  <ThemeSwitcher />

                  <Separator />

                  {/* Stats Section */}
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

                  {/* Favorite Audios Section */}
                  {favoritePodcasts.length > 0 && (
                    <>
                      <Separator />
                      <section>
                        {/* Header with "See all" button */}
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="font-headline text-2xl font-bold tracking-tight">
                            Favorite Audios
                          </h2>
                          {favoritePodcasts.length > itemsPerRow && (
                            <Button
                              variant="link"
                              onClick={() => setIsFavoritesExpanded(!isFavoritesExpanded)}
                              className="text-primary"
                            >
                              {isFavoritesExpanded ? "Show less" : "See all"}
                            </Button>
                          )}
                        </div>

                        {/* Grid Layout: Mobile 2 cols, Desktop 3 cols */}
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                          {(isFavoritesExpanded ? favoritePodcasts : favoritePodcasts.slice(0, itemsPerRow)).map(
                            (podcast) => (
                              <PodcastCard
                                key={podcast.id}
                                podcast={podcast}
                                playlist={favoritePodcasts}
                              />
                            )
                          )}
                        </div>
                      </section>
                    </>
                  )}

                  <Separator />

                  {/* Data Management Section */}
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
                      {!user.isGuest && hasBackupAccessRole(user.role) && (
                        <GoogleDriveBackupCard />
                      )}
                  </div>

                  <Separator />

                  {/* Logout Section */}
                  <div className="w-full space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </div>

                  <Separator />

                  {/* Back to Home */}
                  <div className="w-full">
                     <Link to="/" >
                        <Button variant="link" className="w-full">
                           <Home className="mr-2 h-4 w-4"/>
                           Back to Home
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

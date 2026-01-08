import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { PodcastProvider } from "@/context/PodcastContext";
import { PlayerProvider } from "@/context/PlayerContext";
import { PlaylistProvider } from "@/context/PlaylistContext";
import { UserProvider } from "@/context/UserContext";
import OfflineIndicator from "@/components/layout/OfflineIndicator";

export const metadata: Metadata = {
  title: "MNR Talk",
  description: "Your personalized audio library.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://banglawebfonts.pages.dev/css/solaiman-lipi.min.css"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://stream.mnr.world" />
      </head>
      <body className="font-body antialiased">
        <UserProvider>
          <PodcastProvider>
            <PlaylistProvider>
              <PlayerProvider>
                <OfflineIndicator />
                {children}
                <Toaster />
              </PlayerProvider>
            </PlaylistProvider>
          </PodcastProvider>
        </UserProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { PodcastProvider } from "@/context/PodcastContext";
import { PlayerProvider } from "@/context/PlayerContext";
import { PlaylistProvider } from "@/context/PlaylistContext";
import { UserProvider } from "@/context/UserContext";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "MNR Talk",
  description: "Your personalized audio library.",
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
        <ThemeProvider>
          <UserProvider>
            <PodcastProvider>
              <PlaylistProvider>
                <PlayerProvider>
                  {children}
                  <Toaster />
                </PlayerProvider>
              </PlaylistProvider>
            </PodcastProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

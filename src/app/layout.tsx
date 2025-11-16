import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { PodcastProvider } from "@/context/PodcastContext";
import { PlayerProvider } from "@/context/PlayerContext";
import { PlaylistProvider } from "@/context/PlaylistContext";
import { UserProvider } from "@/context/UserContext";

export const metadata: Metadata = {
  title: "MNR Talks",
  description: "Your personalized audio library.",
};

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-body antialiased`}>
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
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
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
const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-noto-sans-bengali",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${notoSansBengali.variable} font-body antialiased`}
      >
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

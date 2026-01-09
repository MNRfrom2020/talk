
"use client";

import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const AudioWave = () => (
    <motion.div
        className={cn("flex w-6 h-6 items-center justify-center gap-0.5")}
        >
        <motion.div
        className="w-1.5 h-4 bg-current rounded-full"
        animate={{ scaleY: [1, 1.5, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
        className="w-1.5 h-6 bg-current rounded-full"
        animate={{ scaleY: [1.5, 1, 1.5] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.div
        className="w-1.5 h-4 bg-current rounded-full"
        animate={{ scaleY: [1, 1.5, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
    </motion.div>
)

export default function ResumePlayButton() {
  const { currentTrack, togglePlay, isExpanded, isPlaying } = usePlayer();

  const isVisible = currentTrack && !isExpanded && !isPlaying;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-24 right-4 z-50 md:bottom-28 md:right-8"
        >
          <Button
            size="icon"
            className="h-16 w-16 rounded-full bg-accent text-accent-foreground shadow-2xl hover:bg-accent/90"
            onClick={(e) => {
                e.stopPropagation();
                togglePlay();
            }}
          >
            {isPlaying ? <AudioWave /> : <Play className="h-8 w-8 fill-current" />}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

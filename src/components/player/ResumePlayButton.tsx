
"use client";

import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function ResumePlayButton() {
  const { currentTrack, togglePlay, isExpanded } = usePlayer();

  // Show the button only when there is NO track in the player
  // and the player is not expanded.
  const isVisible = !currentTrack && !isExpanded;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-24 right-4 z-50 md:bottom-8 md:right-8"
        >
          <Button
            size="icon"
            className="h-16 w-16 rounded-full bg-accent text-accent-foreground shadow-2xl hover:bg-accent/90"
            onClick={(e) => {
                e.stopPropagation();
                togglePlay();
            }}
          >
            <Play className="h-8 w-8 fill-current" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

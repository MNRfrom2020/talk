"use client";

import { motion, AnimatePresence } from "framer-motion";

interface OverlayProps {
  isVisible: boolean;
  onClick: () => void;
}

export default function Overlay({ isVisible, onClick }: OverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClick}
        />
      )}
    </AnimatePresence>
  );
}

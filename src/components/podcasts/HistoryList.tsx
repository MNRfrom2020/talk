
"use client";

import { usePlayer } from "@/context/PlayerContext";
import CategorySection from "./CategorySection";

export default function HistoryList() {
  const { history } = usePlayer();

  if (history.length === 0) {
    return (
      <section>
        <h2 className="font-headline mb-4 text-2xl font-bold tracking-tight">
          Recently Played
        </h2>
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
          <p className="text-muted-foreground">
            Your listening history is empty.
          </p>
        </div>
      </section>
    );
  }

  return <CategorySection title="Recently Played" podcasts={history} />;
}

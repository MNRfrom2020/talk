import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import PodcastCard from "@/components/podcasts/PodcastCard";
import type { Podcast } from "@/lib/types";

interface DraggablePlaylistGridProps {
  podcasts: Podcast[];
  playlistId: string;
  onRemove?: (podcastId: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export default function DraggablePlaylistGrid({
  podcasts,
  playlistId,
  onRemove,
  onReorder,
}: DraggablePlaylistGridProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const reordered = Array.from(podcasts);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    onReorder(reordered.map((p) => p.id));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={`playlist-${playlistId}`} direction="horizontal">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`grid grid-cols-2 gap-4 pb-4 sm:grid-cols-3 md:grid-cols-4 md:pb-8 lg:grid-cols-5 xl:grid-cols-6 ${
              snapshot.isDraggingOver ? "rounded-lg bg-muted/50 p-1" : ""
            }`}
          >
            {podcasts.map((podcast, index) => (
              <Draggable key={podcast.id} draggableId={podcast.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className="relative"
                  >
                    {dragSnapshot.isDragging && (
                      <div className="absolute inset-0 z-50 rounded-lg ring-2 ring-primary/40" />
                    )}
                    <PodcastCard
                      podcast={podcast}
                      playlist={podcasts}
                      playlistId={playlistId}
                      onRemove={onRemove ? () => onRemove(podcast.id) : undefined}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

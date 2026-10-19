"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { ProjectIcon } from "@/components/projects/project-bits";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import type { Favorite } from "@/lib/projects";
import { errorMessage, strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

const rowClass =
  "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring";

export function Favorites({ favorites, collapsed }: { favorites: Favorite[]; collapsed: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState(favorites);
  const [prev, setPrev] = useState(favorites);
  if (favorites !== prev) {
    setPrev(favorites);
    setItems(favorites);
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const before = items;
    const next = arrayMove(
      items,
      items.findIndex((f) => f.id === active.id),
      items.findIndex((f) => f.id === over.id),
    );
    setItems(next);
    api("/me/favorites", { method: "PUT", body: { projectIds: next.map((f) => f.id) } }).then(
      () => router.refresh(),
      (e: unknown) => {
        setItems(before);
        toast.error(errorMessage(e instanceof ApiError ? e.code : undefined));
      },
    );
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-0.5 px-2 pt-4">
        {items.map((f) => (
          <Tooltip key={f.id}>
            <TooltipTrigger asChild>
              <Link href={`/projects/${f.id}`} aria-label={f.name} className={cn(rowClass, "w-9 justify-center px-0")}>
                <ProjectIcon project={f} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{f.name}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-2 pt-4">
      <h2 className="px-2 font-sans text-xs font-medium text-muted-foreground">{strings.nav.favorites}</h2>
      {items.length === 0 ? (
        <p className="px-2 text-xs text-muted-foreground">{strings.nav.favoritesEmpty}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-0.5">
              {items.map((f) => (
                <FavoriteRow key={f.id} favorite={f} active={pathname.startsWith(`/projects/${f.id}`)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function FavoriteRow({ favorite, active }: { favorite: Favorite; active: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: favorite.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition }}
      className={cn("group relative", isDragging && "z-10 opacity-80")}
    >
      <Link
        href={`/projects/${favorite.id}`}
        aria-current={active ? "page" : undefined}
        className={cn(rowClass, "pr-7", active && "bg-primary/10 font-medium text-primary")}
      >
        <ProjectIcon project={favorite} />
        <span className={cn("truncate", favorite.archivedAt && "text-muted-foreground")}>{favorite.name}</span>
      </Link>
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={strings.nav.favoritesReorder(favorite.name)}
        className="absolute top-1/2 right-1 grid size-6 -translate-y-1/2 cursor-grab place-items-center rounded-sm text-muted-foreground opacity-0 outline-none group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <GripVertical className="size-4" />
      </button>
    </li>
  );
}

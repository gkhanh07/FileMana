import { Skeleton } from "@/components/ui/skeleton";

// FR-UI-01: a page-shaped skeleton inside the shell while a page loads.
export default function Loading() {
  return (
    <main className="flex flex-1 flex-col gap-3 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </main>
  );
}

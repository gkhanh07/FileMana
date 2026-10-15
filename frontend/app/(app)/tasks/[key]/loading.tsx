import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

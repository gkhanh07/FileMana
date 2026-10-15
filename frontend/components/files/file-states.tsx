import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { strings } from "@/lib/strings";

export function FilesLoading() {
  return <div className="flex flex-col gap-4 p-6"><Skeleton className="h-5 w-40" /><Skeleton className="h-8 w-64" /><Skeleton className="h-9 w-full" />{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>;
}
export function FilesError({ retry }: { retry: () => void }) {
  return <div role="alert" className="flex flex-col items-start gap-3 py-6"><p className="text-sm text-muted-foreground">{strings.files.loadFailed}</p><Button variant="outline" onClick={retry}>{strings.files.retry}</Button></div>;
}
export function FilesMissing() {
  return <div className="flex flex-col items-start gap-4 p-6"><h1 className="text-xl">{strings.notFound.title}</h1><p className="text-sm text-muted-foreground">{strings.files.notFound}</p><Button variant="outline" asChild><Link href="/">{strings.files.home}</Link></Button></div>;
}

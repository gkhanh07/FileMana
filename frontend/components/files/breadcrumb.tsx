import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ItemDetail } from "@/lib/files";
import { strings } from "@/lib/strings";

export function FileBreadcrumb({ item }: { item: ItemDetail }) {
  if (!item.path.length) return null;
  const root = item.project ? `/projects/${item.project.id}/files` : "/docs";
  return <nav aria-label={strings.files.breadcrumb} className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">{item.path.map((p, i) => <span key={p.id} className="flex items-center gap-1"><Link href={i ? `/docs/${p.id}` : root} className="hover:underline">{p.name || strings.files.untitled}</Link><ChevronRight aria-hidden className="size-3" /></span>)}<span aria-current="page" className="text-foreground">{item.name || strings.files.untitled}</span></nav>;
}

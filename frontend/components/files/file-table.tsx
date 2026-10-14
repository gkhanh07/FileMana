"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/shell/user-avatar";
import { fileIcon, formatSize, type Item } from "@/lib/files";
import { formatDate } from "@/lib/format";
import { strings } from "@/lib/strings";
import { ItemActions } from "./item-actions";

const t = strings.files;
export function FileTable({ items, timeZone, readOnly = false, parentId }: { items: Item[]; timeZone: string; readOnly?: boolean; parentId?: string }) {
  return <div className="overflow-x-auto rounded-md border"><table className="w-full text-left text-sm">
    <thead className="border-b bg-muted/40 text-muted-foreground"><tr className="h-9"><th className="px-3 font-medium">{t.name}</th><th className="hidden px-3 font-medium xl:table-cell">{t.creator}</th><th className="px-3 font-medium">{t.updated}</th><th className="px-3 text-right font-medium">{t.size}</th><th className="w-10"><span className="sr-only">{t.menu}</span></th></tr></thead>
    <tbody>{items.map((item) => {
      const Icon = fileIcon(item);
      return <ItemActions key={item.id} item={item} readOnly={readOnly} parentId={parentId}>{(menu) => <tr className="h-10 border-b last:border-0 hover:bg-muted/50">
        <td className="max-w-80 px-3"><Link href={`/docs/${item.id}`} className="flex min-w-0 items-center gap-2 py-2 hover:underline"><Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" /><span className="truncate">{item.name || t.untitled}</span></Link></td>
        <td className="hidden px-3 xl:table-cell">{item.creator ? <span className="flex items-center gap-2"><UserAvatar user={item.creator} className="size-5 text-[10px]" />{item.creator.name}</span> : "—"}</td>
        <td className="whitespace-nowrap px-3 text-muted-foreground tabular-nums">{formatDate(item.updatedAt, timeZone)}</td><td className="whitespace-nowrap px-3 text-right text-muted-foreground tabular-nums">{formatSize(item.size)}</td><td className="pr-1">{menu}</td>
      </tr>}</ItemActions>;
    })}</tbody>
  </table></div>;
}

import { createElement } from "react";
import { fileIcon, type Item } from "@/lib/files";

export function FileTypeIcon({ item, className }: { item: Pick<Item, "kind" | "name">; className?: string }) {
  return createElement(fileIcon(item), { "aria-hidden": true, className });
}

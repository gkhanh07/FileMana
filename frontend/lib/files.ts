import { Archive, File, FileCode, FileImage, FileSpreadsheet, FileText, FileVideo, Folder, Presentation } from "lucide-react";
import type { components } from "./api/schema";

export type Item = components["schemas"]["ItemDto"];
export type Root = components["schemas"]["RootDto"];
export type ItemDetail = components["schemas"]["ItemDetailDto"];
export type ItemsPage = components["schemas"]["ItemsPageDto"];
export const MAX_UPLOAD = 100 * 1024 * 1024;
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export const itemKey = (id: string) => ["item", id];
export const childrenKey = (id: string) => ["items", id];
export const rawUrl = (url: string) => `${API_BASE}${url}`;

export function formatSize(bytes: number | null): string {
  if (bytes === null) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const power = bytes > 0 ? Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024))) : 0;
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(bytes / 1024 ** power)} ${units[power]}`;
}

export function fileKind(name: string) {
  const ext = name.split(".").at(-1)?.toLowerCase() ?? "";
  if (/^(png|jpg|jpeg|gif|webp|avif|bmp)$/.test(ext)) return "image";
  if (/^(mp4|webm|ogv|mov|m4v)$/.test(ext)) return "video";
  if (ext === "pdf") return "pdf";
  if (/^(txt|md|csv|tsv|log|json|xml|yaml|yml|toml|ini|env|js|jsx|ts|tsx|css|html|svg|py|java|c|cpp|h|cs|go|rs|php|rb|sh|sql|vue|svelte)$/.test(ext)) return "text";
  if (/^(doc|docx|odt)$/.test(ext)) return "document";
  if (/^(xls|xlsx|ods)$/.test(ext)) return "spreadsheet";
  if (/^(ppt|pptx|odp)$/.test(ext)) return "presentation";
  if (/^(zip|rar|7z|gz|tar)$/.test(ext)) return "archive";
  return "other";
}

export function fileIcon(item: Pick<Item, "kind" | "name">) {
  if (item.kind === "FOLDER") return Folder;
  return { image: FileImage, video: FileVideo, pdf: FileText, text: FileCode, document: FileText,
    spreadsheet: FileSpreadsheet, presentation: Presentation, archive: Archive, other: File }[fileKind(item.name)];
}

export function appLink(text: string, origin: string): { kind: "task" | "project"; id: string } | null {
  try {
    const url = new URL(text, origin);
    if (url.origin !== origin) return null;
    const match = url.pathname.match(/^\/(tasks|projects)\/([^/]+)\/?$/);
    if (!match || (!text.startsWith("/") && !/^https?:\/\//.test(text))) return null;
    return { kind: match[1] === "tasks" ? "task" : "project", id: decodeURIComponent(match[2]) };
  } catch { return null; }
}

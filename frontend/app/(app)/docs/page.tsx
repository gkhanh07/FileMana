import { ItemView } from "@/components/files/item-view";
import { getChildren, getItem } from "@/lib/api/items-server";
import { getWorkspace } from "@/lib/api/server";

export default async function DocsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const search = await searchParams;
  const type = search.type === "files" ? "files" : "all";
  const q = search.q ?? "";
  const [folder, workspace] = await Promise.all([getItem("/items/library"), getWorkspace()]);
  const children = await getChildren(folder.id, type, q);
  return <ItemView key={folder.id} initial={folder} childrenPage={children} type={type} q={q} timeZone={workspace.timezone} />;
}

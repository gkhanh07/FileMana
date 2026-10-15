import { ItemView } from "@/components/files/item-view";
import { getChildren, getItem } from "@/lib/api/items-server";
import { getWorkspace } from "@/lib/api/server";

export default async function ItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const type = search.type === "files" ? "files" : "all";
  const q = search.q ?? "";
  const [item, workspace] = await Promise.all([getItem(`/items/${id}`), getWorkspace()]);
  const children = item.kind === "FOLDER" ? await getChildren(id, type, q) : undefined;
  return <ItemView key={id} initial={item} childrenPage={children} type={type} q={q} timeZone={workspace.timezone} />;
}

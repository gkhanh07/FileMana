import { ItemView } from "@/components/files/item-view";
import { getChildren, getItem } from "@/lib/api/items-server";
import { getWorkspace } from "@/lib/api/server";

export default async function ProjectFilesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const type = search.type === "files" ? "files" : "all";
  const q = search.q ?? "";
  const [folder, workspace] = await Promise.all([getItem(`/projects/${id}/folder`), getWorkspace()]);
  const children = await getChildren(folder.id, type, q);
  return <ItemView key={folder.id} initial={folder} childrenPage={children} type={type} q={q} timeZone={workspace.timezone} />;
}

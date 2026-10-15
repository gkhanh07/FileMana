import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { TaskDetail } from "@/components/tasks/task-detail";
import { getWorkspace, serverApi } from "@/lib/api/server";
import { ApiError } from "@/lib/api/error";
import type { TaskDetail as Detail } from "@/lib/tasks";

// FR-SHELL-07: the same content as the panel, as its own page.
export default async function TaskPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const [task, workspace] = await Promise.all([
    serverApi<Detail>(`/tasks/${encodeURIComponent(key)}`).catch((e) => {
      if (e instanceof ApiError && e.statusCode === 404) notFound();
      throw e;
    }),
    getWorkspace(),
  ]);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href={`/projects/${task.projectId}/tasks`} className="hover:text-foreground">
          {task.project.name}
        </Link>
        <ChevronRight aria-hidden className="size-4" />
        <span className="font-mono">{task.key}</span>
      </nav>
      <div className="mt-4 flex flex-col rounded-lg border">
        <TaskDetail taskKey={task.key} timeZone={workspace.timezone} initial={task} />
      </div>
    </main>
  );
}

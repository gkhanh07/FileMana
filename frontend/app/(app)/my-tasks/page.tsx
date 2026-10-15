import { MyTaskList } from "@/components/tasks/my-tasks";
import { getWorkspace, serverApi } from "@/lib/api/server";
import { strings } from "@/lib/strings";
import type { MyTask } from "@/lib/tasks";

// FR-MY-01..04
export default async function MyTasksPage() {
  const [tasks, workspace] = await Promise.all([serverApi<MyTask[]>("/me/tasks"), getWorkspace()]);
  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <h1 className="font-heading text-3xl">{strings.nav.myTasks}</h1>
      <MyTaskList initialTasks={tasks} timeZone={workspace.timezone} />
    </main>
  );
}

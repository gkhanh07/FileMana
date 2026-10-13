import { TaskList } from "@/components/tasks/task-list";
import { getProject, getWorkspace, serverApi } from "@/lib/api/server";
import { parseTasksView, type Label, type Task } from "@/lib/tasks";

// FR-TASK-01..05
export default async function ProjectTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [project, tasks, labels, workspace] = await Promise.all([
    getProject(id),
    serverApi<Task[]>(`/projects/${id}/tasks`),
    serverApi<Label[]>("/labels"),
    getWorkspace(),
  ]);
  return (
    <TaskList
      // Another project starts with a fresh list.
      key={id}
      projectId={id}
      initialTasks={tasks}
      labels={labels}
      timeZone={workspace.timezone}
      weekStartsOn={workspace.weekStartsOn}
      readOnly={!!project.archivedAt}
      initial={parseTasksView(query)}
    />
  );
}

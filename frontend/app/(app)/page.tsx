import Link from "next/link";
import { ProjectDue, ProjectIcon, projectBorderClass, projectColorClass } from "@/components/projects/project-bits";
import { HomeTasks } from "@/components/tasks/my-tasks";
import { getMe, getWorkspace, serverApi } from "@/lib/api/server";
import { dayKey, formatLongDate, hourIn } from "@/lib/format";
import { runningProjects, type Project } from "@/lib/projects";
import { strings } from "@/lib/strings";
import type { MyTask } from "@/lib/tasks";
import { cn } from "@/lib/utils";

const h = strings.home;

// FR-HOME-01..07
export default async function Home() {
  const [me, workspace, tasks, projects] = await Promise.all([
    getMe(),
    getWorkspace(),
    serverApi<MyTask[]>("/me/tasks"),
    serverApi<Project[]>("/projects"),
  ]);
  const tz = workspace.timezone;
  const now = new Date();
  const running = runningProjects(projects, me.id);
  return (
    <main className="flex flex-1 items-start gap-8 p-6">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <header className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="font-heading text-3xl">{h.greeting(hourIn(tz, now), me.name)}</h1>
          <p className="text-muted-foreground">{formatLongDate(dayKey(now, tz))}</p>
        </header>
        <HomeTasks initialTasks={tasks} timeZone={tz} />
      </div>
      <section aria-labelledby="running" className="flex w-72 shrink-0 flex-col gap-3">
        <h2 id="running" className="font-heading text-lg">
          {h.projects}
        </h2>
        {running.length === 0 ? (
          <p className="text-sm text-muted-foreground">{h.noProjects}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {running.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border border-l-3 p-3 hover:bg-muted/50",
                    projectBorderClass(p.color),
                  )}
                >
                  <span className="flex items-center gap-2">
                    <ProjectIcon project={p} />
                    <span className="truncate text-sm font-medium">{p.name}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn("block h-full", projectColorClass(p.color))}
                        style={{ width: `${p.taskCount ? (p.doneCount / p.taskCount) * 100 : 0}%` }}
                      />
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {h.percent(p.doneCount, p.taskCount)}
                    </span>
                    <ProjectDue project={p} timeZone={tz} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

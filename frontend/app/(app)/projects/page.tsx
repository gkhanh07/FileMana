import { NewProjectButton } from "@/components/projects/new-project-button";
import { ProjectsTable, type ProjectsView } from "@/components/projects/projects-table";
import { getWorkspace, serverApi } from "@/lib/api/server";
import { PROJECT_STATUSES, type Project, type StatusFilter } from "@/lib/projects";
import { strings } from "@/lib/strings";

const STATUS_FILTERS: string[] = ["open", ...PROJECT_STATUSES, "archived"];

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const [projects, workspace] = await Promise.all([serverApi<Project[]>("/projects"), getWorkspace()]);
  const initial: ProjectsView = {
    status: (STATUS_FILTERS.includes(params.status) ? params.status : "open") as StatusFilter,
    q: params.q ?? "",
    sort: params.sort === "updated" ? "updated" : "due",
  };
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl">{strings.nav.projects}</h1>
        <span className="text-sm text-muted-foreground">{strings.projects.count(projects.length)}</span>
        <div className="ml-auto">
          <NewProjectButton />
        </div>
      </div>
      <ProjectsTable projects={projects} timeZone={workspace.timezone} initial={initial} />
    </main>
  );
}

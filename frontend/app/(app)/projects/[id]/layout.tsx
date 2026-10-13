import { notFound } from "next/navigation";
import { MembersPopover } from "@/components/projects/members-popover";
import { ProjectDue, ProjectIcon, ProjectStatusBadge } from "@/components/projects/project-bits";
import { ArchivedBanner, PinButton, ProjectTabs } from "@/components/projects/project-header";
import { ProjectMenu } from "@/components/projects/project-menu";
import { ApiError } from "@/lib/api/error";
import { getWorkspace, serverApi } from "@/lib/api/server";
import type { Project } from "@/lib/projects";

async function getProject(id: string) {
  try {
    return await serverApi<Project>(`/projects/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.statusCode === 404) notFound();
    throw e;
  }
}

// FR-PRJ-05/06: the header and tabs stay put while the tab below changes.
export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const [project, workspace] = await Promise.all([getProject(id), getWorkspace()]);
  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      {project.archivedAt && <ArchivedBanner project={project} />}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <ProjectIcon project={project} className="size-7 text-sm" />
          <h1 className="truncate text-2xl">{project.name}</h1>
          <span className="font-mono text-sm text-muted-foreground">{project.key}</span>
          <PinButton project={project} />
          <div className="ml-auto flex items-center gap-4">
            <ProjectStatusBadge project={project} />
            <ProjectDue project={project} timeZone={workspace.timezone} />
            <MembersPopover project={project} />
            <ProjectMenu project={project} />
          </div>
        </div>
        {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
      </div>
      <ProjectTabs id={project.id} />
      {children}
    </main>
  );
}

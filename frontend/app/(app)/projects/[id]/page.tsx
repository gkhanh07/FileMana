import { ProjectOverview, type ActivityPage, type ProjectStats } from "@/components/projects/project-overview";
import { getProject, getWorkspace, serverApi } from "@/lib/api/server";
import { ACTIVITY_PAGE } from "@/lib/projects";
import type { Milestone } from "@/lib/tasks";

// FR-PRJ-07, FR-PRJ-08
export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, stats, milestones, activity, workspace] = await Promise.all([
    getProject(id),
    serverApi<ProjectStats>(`/projects/${id}/stats`),
    serverApi<Milestone[]>(`/projects/${id}/milestones`),
    serverApi<ActivityPage>(`/projects/${id}/activity?limit=${ACTIVITY_PAGE}`),
    getWorkspace(),
  ]);
  return (
    <ProjectOverview
      key={id}
      projectId={id}
      readOnly={!!project.archivedAt}
      timeZone={workspace.timezone}
      stats={stats}
      milestones={milestones}
      activity={activity}
    />
  );
}

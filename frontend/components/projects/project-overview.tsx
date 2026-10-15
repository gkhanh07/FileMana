"use client";

import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { UserAvatar } from "@/components/shell/user-avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { formatDate, formatRelative, formatTime } from "@/lib/format";
import { strings } from "@/lib/strings";
import { ACTIVITY_PAGE } from "@/lib/projects";
import { describeActivity, type Activity, type Milestone } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { Milestones } from "./milestones";

export type ProjectStats = components["schemas"]["ProjectStatsDto"];
export type ProjectActivity = Activity & { task: components["schemas"]["TaskRefDto"] | null };
export type ActivityPage = { items: ProjectActivity[]; hasMore: boolean };

const o = strings.projects.overview;
const s = strings.tasks.status;

// FR-PRJ-07: one row of stats, the milestones, recent activity.
export function ProjectOverview({
  projectId,
  readOnly,
  timeZone,
  stats: initialStats,
  milestones,
  activity,
}: {
  projectId: string;
  readOnly: boolean;
  timeZone: string;
  stats: ProjectStats;
  milestones: Milestone[];
  activity: ActivityPage;
}) {
  const { data: stats } = useQuery({
    queryKey: ["project-stats", projectId],
    queryFn: () => api<ProjectStats>(`/projects/${projectId}/stats`),
    initialData: initialStats,
    staleTime: 0,
  });
  const pct = stats.taskCount ? Math.round((stats.doneCount / stats.taskCount) * 100) : 0;
  // ponytail: Review counts as in progress here; the four numbers the spec names.
  const items = [
    { label: o.progress, value: `${pct}%` },
    { label: s.DONE, value: stats.doneCount, dot: "bg-status-green" },
    { label: s.IN_PROGRESS, value: stats.inProgressCount + stats.reviewCount, dot: "bg-status-blue" },
    { label: s.TODO, value: stats.todoCount, dot: "bg-status-gray" },
    {
      label: o.overdue,
      value: stats.overdueCount,
      danger: stats.overdueCount > 0,
      dot: stats.overdueCount > 0 ? "bg-destructive" : undefined,
    },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <dl aria-label={o.stats} className="grid grid-cols-5 divide-x rounded-md border">
        {items.map((x) => (
          <div key={x.label} className="flex flex-col gap-1 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {x.dot && <span aria-hidden className={cn("size-1.5 rounded-full", x.dot)} />}
              {x.label}
            </dt>
            <dd className={cn("text-xl font-semibold tabular-nums", x.danger && "text-destructive")}>{x.value}</dd>
          </div>
        ))}
      </dl>
      <Milestones projectId={projectId} initial={milestones} readOnly={readOnly} />
      <RecentActivity projectId={projectId} timeZone={timeZone} initial={activity} />
    </div>
  );
}

function RecentActivity({
  projectId,
  timeZone,
  initial,
}: {
  projectId: string;
  timeZone: string;
  initial: ActivityPage;
}) {
  const query = useInfiniteQuery({
    queryKey: ["project-activity", projectId],
    queryFn: ({ pageParam }) =>
      api<ActivityPage>(`/projects/${projectId}/activity?offset=${pageParam}&limit=${ACTIVITY_PAGE}`),
    initialPageParam: 0,
    initialData: { pages: [initial], pageParams: [0] },
    staleTime: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length * ACTIVITY_PAGE : undefined),
  });
  const items = query.data.pages.flatMap((p) => p.items);

  return (
    <section aria-labelledby="recent-activity" className="flex flex-col gap-3">
      <h2 id="recent-activity" className="text-base font-semibold">
        {o.activity}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{o.noActivity}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((a) => (
            <li key={a.id} className="flex gap-2 text-sm">
              <UserAvatar user={a.actor} className="mt-0.5 size-5 text-[10px]" />
              <p className="min-w-0 flex-1">
                <span className="font-medium">{a.actor.name}</span> {describeActivity(a)}
                {a.task && (
                  <>
                    {" · "}
                    <Link href={`/tasks/${a.task.key}`} className="hover:underline">
                      <span className="font-mono text-xs text-muted-foreground">{a.task.key}</span> {a.task.title}
                    </Link>
                  </>
                )}
                <time
                  dateTime={a.createdAt}
                  title={`${formatDate(a.createdAt, timeZone)} ${formatTime(a.createdAt, timeZone)}`}
                  className="ml-2 text-xs text-muted-foreground"
                >
                  {formatRelative(a.createdAt, timeZone)}
                </time>
              </p>
            </li>
          ))}
        </ol>
      )}
      {query.isFetchNextPageError && (
        <p className="text-sm text-muted-foreground">{o.loadFailed}</p>
      )}
      {query.hasNextPage && (
        <Button
          variant="link"
          size="sm"
          className="self-start px-0 text-muted-foreground"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {strings.tasks.seeMore}
        </Button>
      )}
    </section>
  );
}

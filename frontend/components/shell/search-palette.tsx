"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FolderKanban, SquareCheckBig, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";
import { FileTypeIcon } from "@/components/files/file-icon";
import { ProjectIcon } from "@/components/projects/project-bits";
import { StatusIcon } from "@/components/tasks/task-bits";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { api } from "@/lib/api/client";
import { fold } from "@/lib/comments";
import { formatRelative } from "@/lib/format";
import { hitHref, hitKey, pushRecent, toHits, type Hit, type SearchResult } from "@/lib/search";
import { strings } from "@/lib/strings";
import { useSaveTheme } from "./theme-menu";
import { UserAvatar } from "./user-avatar";

const s = strings.search;
const RECENT = "search-recent";
const groups = ["task", "project", "item", "member"] as const;
const groupLabel = { task: s.groups.tasks, project: s.groups.projects, item: s.groups.items, member: s.groups.members };

function readRecent(): Hit[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT) ?? "[]") as Hit[];
  } catch {
    return [];
  }
}

export function SearchPalette({
  onClose,
  onCreateTask,
  onCreateProject,
  timeZone,
}: {
  onClose: () => void;
  onCreateTask: () => void;
  onCreateProject: () => void;
  timeZone: string;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const saveTheme = useSaveTheme();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [recent] = useState(readRecent);

  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), 150);
    return () => clearTimeout(id);
  }, [text]);

  const search = useQuery({
    queryKey: ["search", q],
    queryFn: () => api<SearchResult>(`/search?${new URLSearchParams({ q })}`),
    enabled: !!q,
    placeholderData: keepPreviousData,
  });

  const typed = text.trim();
  const hits = !typed ? recent : search.data ? toHits(search.data) : [];
  const waiting = !!typed && (typed !== q || search.isFetching);

  const run = (action: () => void) => {
    onClose();
    action();
  };
  const open = (hit: Hit) =>
    run(() => {
      try {
        localStorage.setItem(RECENT, JSON.stringify(pushRecent(recent, hit)));
      } catch {}
      router.push(hitHref(hit));
    });

  const commands = [
    { id: "create-task", label: s.commands.createTask, Icon: SquareCheckBig, action: onCreateTask },
    { id: "create-project", label: s.commands.createProject, Icon: FolderKanban, action: onCreateProject },
    {
      id: "theme",
      label: s.commands.theme,
      Icon: SunMoon,
      action: () => saveTheme.mutate(resolvedTheme === "dark" ? "light" : "dark"),
    },
  ].filter((c) => fold(c.label).includes(fold(typed)));

  return (
    <CommandDialog open onOpenChange={(next) => !next && onClose()} title={s.title} description={s.placeholder} className="sm:max-w-160">
      <Command shouldFilter={false}>
        <CommandInput value={text} onValueChange={setText} placeholder={s.placeholder} />
        <CommandList className="max-h-96">
          {typed && search.isError ? (
            <p role="alert" className="py-6 text-center text-sm text-muted-foreground">
              {s.error}
            </p>
          ) : typed && waiting && !hits.length ? (
            <p role="status" className="py-6 text-center text-sm text-muted-foreground">
              {s.loading}
            </p>
          ) : (
            <CommandEmpty>{s.empty}</CommandEmpty>
          )}
          {typed ? (
            groups.map((type) => {
              const rows = hits.filter((h) => h.type === type);
              return rows.length ? (
                <CommandGroup key={type} heading={groupLabel[type]}>
                  {rows.map((h) => (
                    <HitRow key={hitKey(h)} hit={h} timeZone={timeZone} onSelect={open} />
                  ))}
                </CommandGroup>
              ) : null;
            })
          ) : recent.length ? (
            <CommandGroup heading={s.recent}>
              {recent.map((h) => (
                <HitRow key={hitKey(h)} hit={h} onSelect={open} />
              ))}
            </CommandGroup>
          ) : null}
          {!!commands.length && (
            <CommandGroup heading={s.groups.commands}>
              {commands.map(({ id, label, Icon, action }) => (
                <CommandItem key={id} value={`command:${id}`} onSelect={() => run(action)}>
                  <Icon aria-hidden />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

function HitRow({ hit, timeZone, onSelect }: { hit: Hit; timeZone?: string; onSelect: (hit: Hit) => void }) {
  const [icon, name, location, updatedAt] =
    hit.type === "task"
      ? [<StatusIcon key="i" status={hit.data.status} />, `${hit.data.key} ${hit.data.title}`, hit.data.project, hit.data.updatedAt]
      : hit.type === "project"
        ? [<ProjectIcon key="i" project={hit.data} className="size-4 text-[10px]" />, hit.data.name, hit.data.archived ? s.archived : null, hit.data.updatedAt]
        : hit.type === "item"
          ? [<FileTypeIcon key="i" item={hit.data} />, hit.data.name, hit.data.location, hit.data.updatedAt]
          : [<UserAvatar key="i" user={hit.data} className="size-4 text-[8px]" />, hit.data.name, null, null];
  return (
    <CommandItem value={hitKey(hit)} onSelect={() => onSelect(hit)}>
      {icon}
      <span className="truncate">{name}</span>
      {location && <span className="shrink-0 truncate text-xs text-muted-foreground">{location}</span>}
      {timeZone && updatedAt && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatRelative(updatedAt, timeZone)}</span>}
    </CommandItem>
  );
}

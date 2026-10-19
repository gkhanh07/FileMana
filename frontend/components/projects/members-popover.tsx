"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shell/user-avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import type { Person, Project } from "@/lib/projects";
import { errorMessage, strings } from "@/lib/strings";
import { MemberStack } from "./project-bits";

const t = strings.projects.members;

export function MembersPopover({ project }: { project: Project }) {
  const router = useRouter();
  const readOnly = project.archivedAt !== null;
  const people = useQuery({ queryKey: ["users"], queryFn: () => api<Person[]>("/users"), enabled: !readOnly });
  const change = useMutation({
    mutationFn: ({ userId, add }: { userId: string; add: boolean }) =>
      add
        ? api(`/projects/${project.id}/members`, { method: "POST", body: { userId } })
        : api(`/projects/${project.id}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => router.refresh(),
    onError: (e) => toast.error(errorMessage(e instanceof ApiError ? e.code : undefined)),
  });
  const memberIds = new Set(project.members.map((m) => m.id));
  const others = (people.data ?? []).filter((p) => !memberIds.has(p.id));

  return (
    <Popover>
      <PopoverTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={t.manage}>
        <MemberStack people={project.members} />
      </PopoverTrigger>
      <PopoverContent align="start">
        <PopoverTitle className="text-sm font-medium">{t.title}</PopoverTitle>
        <ul className="flex flex-col">
          {project.members.map((m) => (
            <li key={m.id} className="flex h-9 items-center gap-2">
              <UserAvatar user={m} />
              <span className="flex-1 truncate">{m.name}</span>
              {m.id === project.owner.id ? (
                <span className="text-xs text-muted-foreground">{t.owner}</span>
              ) : (
                !readOnly && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t.remove(m.name)}
                    disabled={change.isPending}
                    onClick={() => change.mutate({ userId: m.id, add: false })}
                  >
                    <X />
                  </Button>
                )
              )}
            </li>
          ))}
        </ul>
        {!readOnly &&
          (people.isSuccess && others.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t.noneLeft}</p>
          ) : (
            <Select
              key={project.members.length}
              disabled={change.isPending}
              onValueChange={(userId) => change.mutate({ userId, add: true })}
            >
              <SelectTrigger aria-label={t.add} className="w-full">
                <SelectValue placeholder={t.addPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {others.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
      </PopoverContent>
    </Popover>
  );
}

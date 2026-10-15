"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Ellipsis, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/shell/user-avatar";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import type { components } from "@/lib/api/schema";
import { errorMessage, strings } from "@/lib/strings";

type Member = components["schemas"]["MemberDto"];
type Open =
  | { kind: "add" }
  | { kind: "edit" | "reset" | "delete"; member: Member }
  | null;
const t = strings.settings.members;

// FR-SET-06, FR-AUTH-02, plus add / edit / delete. Your own row has no reset or delete: you use personal settings.
export function MembersTable({ members, meId }: { members: Member[]; meId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<Open>(null);
  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const field = (k: string) => String(form.get(k) ?? "");
      if (open?.kind === "add") {
        const body = { email: field("email"), name: field("name"), jobTitle: field("jobTitle"), password: field("password") };
        await api("/members", { method: "POST", body });
        return t.added(body.name);
      }
      if (open?.kind === "edit") {
        const body = { email: field("email"), name: field("name"), jobTitle: field("jobTitle") };
        await api(`/members/${open.member.id}`, { method: "PATCH", body });
        return t.saved(body.name);
      }
      if (open?.kind === "reset") {
        await api(`/members/${open.member.id}/password`, { method: "POST", body: { password: field("password") } });
        return t.resetDone(open.member.name);
      }
      if (open?.kind === "delete") {
        await api(`/members/${open.member.id}`, { method: "DELETE" });
        return t.deleted(open.member.name);
      }
      return "";
    },
    onSuccess: (message) => {
      toast.success(message);
      setOpen(null);
      router.refresh();
    },
  });
  const show = (next: Open) => {
    save.reset();
    setOpen(next);
  };
  const member = open && open.kind !== "add" ? open.member : null;
  const title = open && { add: t.add, edit: t.edit, reset: t.reset, delete: t.delete }[open.kind];

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Button size="sm" onClick={() => show({ kind: "add" })}>
          <Plus />
          {t.add}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr className="h-9">
              <th className="px-3 font-medium">{t.name}</th>
              <th className="px-3 font-medium">{t.email}</th>
              <th className="px-3 text-right font-medium">{t.openTasks}</th>
              <th className="px-3 font-medium">{t.status}</th>
              <th className="w-10">
                <span className="sr-only">{t.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="h-12 border-b last:border-0">
                <td className="px-3">
                  <span className="flex items-center gap-2">
                    <UserAvatar user={m} className="size-7" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{m.name}</span>
                      {m.jobTitle && <span className="truncate text-xs text-muted-foreground">{m.jobTitle}</span>}
                    </span>
                  </span>
                </td>
                <td className="px-3 text-muted-foreground">{m.email}</td>
                <td className="px-3 text-right tabular-nums">{m.openTaskCount}</td>
                <td className="whitespace-nowrap px-3">{t.statuses[m.status]}</td>
                <td className="whitespace-nowrap px-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={t.memberActions(m.name)}>
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => show({ kind: "edit", member: m })}>
                        <Pencil />
                        {t.edit}
                      </DropdownMenuItem>
                      {m.id !== meId && (
                        <>
                          <DropdownMenuItem onSelect={() => show({ kind: "reset", member: m })}>
                            <KeyRound />
                            {t.reset}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => show({ kind: "delete", member: m })}>
                            <Trash2 />
                            {t.delete}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog
        open={open !== null}
        onOpenChange={(o) => {
          if (!o && !save.isPending) setOpen(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {open?.kind === "reset" && <DialogDescription>{t.resetBody(open.member.name)}</DialogDescription>}
            {open?.kind === "delete" && <DialogDescription>{t.deleteBody(open.member.name)}</DialogDescription>}
            {open?.kind === "add" && <DialogDescription>{t.addBody}</DialogDescription>}
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!save.isPending) save.mutate(new FormData(e.currentTarget));
            }}
          >
            {(open?.kind === "add" || open?.kind === "edit") && (
              <>
                <Field id="name" label={t.name} defaultValue={member?.name} required maxLength={100} autoFocus />
                <Field id="email" label={t.email} type="email" defaultValue={member?.email} required maxLength={254} />
                <Field id="jobTitle" label={t.jobTitle} defaultValue={member?.jobTitle ?? ""} maxLength={100} />
              </>
            )}
            {(open?.kind === "add" || open?.kind === "reset") && (
              <Field
                id="password"
                label={t.tempPassword}
                hint={strings.signUp.passwordHint}
                autoComplete="off"
                required
                minLength={8}
                maxLength={200}
                autoFocus={open.kind === "reset"}
              />
            )}
            {save.error && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage(save.error instanceof ApiError ? save.error.code : undefined)}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" type="button" disabled={save.isPending} onClick={() => setOpen(null)}>
                {strings.files.cancel}
              </Button>
              <Button type="submit" variant={open?.kind === "delete" ? "destructive" : "default"} disabled={save.isPending}>
                {open && { add: t.addSubmit, edit: t.save, reset: t.resetSubmit, delete: t.delete }[open.kind]}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Field({ id, label, hint, ...props }: { id: string; label: string; hint?: string } & React.ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

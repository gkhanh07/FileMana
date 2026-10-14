"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/shell/user-avatar";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import type { components } from "@/lib/api/schema";
import { errorMessage, strings } from "@/lib/strings";

type Member = components["schemas"]["MemberDto"];
const t = strings.settings.members;

// FR-SET-06, FR-AUTH-02. Your own row has no reset: you change your password above.
export function MembersTable({ members, meId }: { members: Member[]; meId: string }) {
  const [target, setTarget] = useState<Member | null>(null);
  const reset = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api(`/members/${id}/password`, { method: "POST", body: { password } }),
    onSuccess: () => {
      toast.success(t.resetDone(target!.name));
      setTarget(null);
    },
  });

  return (
    <section className="flex flex-col gap-4">
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
                  {m.id !== meId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${t.reset} ${m.name}`}
                      onClick={() => {
                        reset.reset();
                        setTarget(m);
                      }}
                    >
                      {t.reset}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open && !reset.isPending) setTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.reset}</DialogTitle>
            <DialogDescription>{target && t.resetBody(target.name)}</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const password = String(new FormData(e.currentTarget).get("tempPassword"));
              if (target && !reset.isPending) reset.mutate({ id: target.id, password });
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tempPassword">{t.tempPassword}</Label>
              <Input
                id="tempPassword"
                name="tempPassword"
                autoComplete="off"
                required
                minLength={8}
                maxLength={200}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">{strings.signUp.passwordHint}</p>
            </div>
            {reset.error && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage(reset.error instanceof ApiError ? reset.error.code : undefined)}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" type="button" disabled={reset.isPending} onClick={() => setTarget(null)}>
                {strings.files.cancel}
              </Button>
              <Button type="submit" disabled={reset.isPending}>
                {t.resetSubmit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

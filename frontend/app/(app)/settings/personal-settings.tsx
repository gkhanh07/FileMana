"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/shell/user-avatar";
import { api, type User } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { errorMessage, strings } from "@/lib/strings";

const t = strings.settings;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // the API enforces the same limit
const codeOf = (e: unknown) => (e instanceof ApiError ? e.code : undefined);
const showError = (e: unknown) => toast.error(errorMessage(codeOf(e)));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const done = () => router.refresh();

  const save = useMutation({
    mutationFn: (body: { name: string; jobTitle: string }) => api<User>("/me", { method: "PATCH", body }),
    onSuccess: () => {
      toast.success(t.saved);
      done();
    },
    onError: showError,
  });
  const upload = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return api<User>("/me/avatar", { method: "PUT", body });
    },
    onSuccess: done,
    onError: showError,
  });
  const remove = useMutation({
    mutationFn: () => api<User>("/me/avatar", { method: "DELETE" }),
    onSuccess: done,
    onError: showError,
  });
  const busy = upload.isPending || remove.isPending;

  return (
    <Section title={t.profile}>
      <div className="flex items-center gap-4">
        <UserAvatar user={user} className="size-16 text-2xl" />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
              {t.changeAvatar}
            </Button>
            {user.avatarUrl && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove.mutate()}>
                {t.removeAvatar}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t.avatarHint}</p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={t.avatar}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // picking the same file again still fires
            if (!file) return;
            if (file.size > AVATAR_MAX_BYTES) return void toast.error(errorMessage("FILE_TOO_LARGE"));
            upload.mutate(file);
          }}
        />
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          save.mutate({ name: String(form.get("name")), jobTitle: String(form.get("jobTitle")) });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">{t.name}</Label>
          <Input id="name" name="name" defaultValue={user.name} required maxLength={100} autoComplete="name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jobTitle">{t.jobTitle}</Label>
          <Input
            id="jobTitle"
            name="jobTitle"
            defaultValue={user.jobTitle ?? ""}
            maxLength={100}
            autoComplete="organization-title"
          />
        </div>
        <Button type="submit" className="self-start" disabled={save.isPending}>
          {save.isPending ? t.saving : t.save}
        </Button>
      </form>
    </Section>
  );
}

export function PasswordForm() {
  const change = useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api("/me/password", { method: "POST", body }),
    onSuccess: () => toast.success(t.passwordChanged),
  });

  return (
    <Section title={t.password}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const formEl = e.currentTarget;
          const form = new FormData(formEl);
          change.mutate(
            { currentPassword: String(form.get("currentPassword")), newPassword: String(form.get("newPassword")) },
            { onSuccess: () => formEl.reset() },
          );
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currentPassword">{t.currentPassword}</Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newPassword">{t.newPassword}</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={200}
            aria-describedby="newPasswordHint"
          />
          <p id="newPasswordHint" className="text-xs text-muted-foreground">
            {t.newPasswordHint}
          </p>
        </div>
        {change.error && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(codeOf(change.error))}
          </p>
        )}
        <Button type="submit" className="self-start" disabled={change.isPending}>
          {t.changePassword}
        </Button>
      </form>
    </Section>
  );
}

export function SignOutOthers() {
  const signOut = useMutation({
    mutationFn: () => api("/me/sessions", { method: "DELETE" }),
    onSuccess: () => toast.success(t.signedOutOthers),
    onError: showError,
  });
  return (
    <Section title={t.sessions}>
      <p className="text-sm text-muted-foreground">{t.sessionsHint}</p>
      <Button variant="outline" className="self-start" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
        {t.signOutOthers}
      </Button>
    </Section>
  );
}

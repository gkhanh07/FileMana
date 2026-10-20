"use client";

import { useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, logoSrc, type Workspace } from "@/lib/api/client";
import { errorMessage, strings } from "@/lib/strings";
import { IMAGE_MAX_BYTES, Section, showError } from "./personal-settings";

const t = strings.settings.workspace;
const noop = () => () => {};
let zoneCache: string[] | undefined;
const allZones = () => (zoneCache ??= Intl.supportedValuesOf("timeZone"));
const noZones: string[] = [];

export function WorkspaceForm({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  // Node's and the browser's timezone lists can differ, so the full list renders only after hydration.
  const zones = useSyncExternalStore(noop, allZones, () => noZones);
  // Chromium lists the default as Asia/Saigon, so the default and the saved value are always added.
  const timezones = [...new Set([...zones, workspace.timezone, "Asia/Ho_Chi_Minh"])].sort();
  const src = logoSrc(workspace);

  const save = useMutation({
    mutationFn: (body: { name: string; timezone: string; weekStartsOn: number }) =>
      api<Workspace>("/workspace", { method: "PATCH", body }),
    onSuccess: () => {
      toast.success(t.saved);
      router.refresh();
    },
    onError: showError,
  });
  const upload = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return api<Workspace>("/workspace/logo", { method: "PUT", body });
    },
    onSuccess: () => router.refresh(),
    onError: showError,
  });
  const remove = useMutation({
    mutationFn: () => api<Workspace>("/workspace/logo", { method: "DELETE" }),
    onSuccess: () => router.refresh(),
    onError: showError,
  });
  const busy = upload.isPending || remove.isPending;

  return (
    <Section title={t.title}>
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-primary font-heading text-2xl text-primary-foreground">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={t.logo} className="size-full bg-background object-contain" />
          ) : (
            <span aria-hidden>{workspace.name.charAt(0).toUpperCase()}</span>
          )}
        </span>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
              {t.changeLogo}
            </Button>
            {src && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove.mutate()}>
                {t.removeLogo}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{strings.settings.avatarHint}</p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={t.logo}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > IMAGE_MAX_BYTES) return void toast.error(errorMessage("FILE_TOO_LARGE"));
            upload.mutate(file);
          }}
        />
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          save.mutate({
            name: String(form.get("name")),
            timezone: String(form.get("timezone")),
            weekStartsOn: Number(form.get("weekStartsOn")),
          });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workspace-name">{t.name}</Label>
          <Input id="workspace-name" name="name" defaultValue={workspace.name} required maxLength={80} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workspace-week-start">{t.weekStart}</Label>
          <Select name="weekStartsOn" defaultValue={String(workspace.weekStartsOn)}>
            <SelectTrigger id="workspace-week-start" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 0].map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {t.weekDays[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workspace-timezone">{t.timezone}</Label>
          <Select name="timezone" defaultValue={workspace.timezone}>
            <SelectTrigger id="workspace-timezone" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {timezones.map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="self-start" disabled={save.isPending}>
          {save.isPending ? strings.settings.saving : strings.settings.save}
        </Button>
      </form>
    </Section>
  );
}

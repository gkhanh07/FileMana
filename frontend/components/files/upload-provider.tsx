"use client";

import { createContext, useContext, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/error";
import { API_BASE, MAX_UPLOAD, type Item } from "@/lib/files";
import { errorMessage, strings } from "@/lib/strings";

const t = strings.files;
type Target = { parentId?: string; taskId?: string };
type Upload = { id: string; file: File; target: Target; progress: number; state: "uploading" | "done" | "error" | "canceled"; error?: string };
type FolderTarget = { id: string; readOnly: boolean } | null;
const UploadContext = createContext<{
  upload: (file: File, target?: Target) => Promise<Item>;
  pick: (target?: Target) => void;
  currentFolder: FolderTarget;
  setCurrentFolder: (folder: FolderTarget) => void;
} | null>(null);

export function useUploads() {
  const value = useContext(UploadContext);
  if (!value) throw new Error("UploadProvider missing");
  return value;
}

// FR-FILE-06: stays mounted across app navigation; each transfer has its own cancel control.
export function UploadProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [entries, setEntries] = useState<Upload[]>([]);
  const [currentFolder, setCurrentFolder] = useState<FolderTarget>(null);
  const requests = useRef(new Map<string, XMLHttpRequest>());
  const picker = useRef<HTMLInputElement>(null);
  const pickedTarget = useRef<Target>({});
  const update = (id: string, patch: Partial<Upload>) => setEntries((old) => old.map((e) => e.id === id ? { ...e, ...patch } : e));
  const upload = (file: File, target: Target = {}): Promise<Item> => {
    const id = crypto.randomUUID();
    const tooLarge = file.size > MAX_UPLOAD;
    setEntries((old) => [...old, { id, file, target, progress: 0, state: tooLarge ? "error" : "uploading", error: tooLarge ? t.tooLarge(file.name) : undefined }]);
    if (tooLarge) return Promise.reject(new ApiError(413, "FILE_TOO_LARGE", t.tooLarge(file.name)));
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      requests.current.set(id, xhr);
      const route = target.taskId ? `/tasks/${target.taskId}/attachments` : `/items/files${target.parentId ? `?parentId=${target.parentId}` : ""}`;
      xhr.open("POST", `${API_BASE}${route}`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) update(id, { progress: Math.round(event.loaded * 100 / event.total) });
      };
      const fail = (error: ApiError) => {
        requests.current.delete(id);
        update(id, { state: "error", error: error.code === "FILE_TOO_LARGE" ? t.tooLarge(file.name) : error.code === "NETWORK" ? t.uploadFailed : errorMessage(error.code) });
        reject(error);
      };
      xhr.onerror = () => fail(new ApiError(0, "NETWORK", t.uploadFailed));
      xhr.onabort = () => {
        requests.current.delete(id);
        update(id, { state: "canceled" });
        reject(new ApiError(0, "CANCELED", t.canceled));
      };
      xhr.onload = () => {
        let data;
        try { data = JSON.parse(xhr.responseText); } catch { fail(new ApiError(xhr.status, "INTERNAL_ERROR", t.uploadFailed)); return; }
        if (xhr.status < 200 || xhr.status >= 300) { fail(new ApiError(xhr.status, data.code, data.message)); return; }
        requests.current.delete(id);
        update(id, { progress: 100, state: "done" });
        for (const key of ["items", "roots", "attachments", "tasks", "my-tasks", "task", "activity"]) void qc.invalidateQueries({ queryKey: [key] });
        resolve(data as Item);
      };
      const body = new FormData();
      body.append("file", file);
      xhr.send(body);
    });
  };
  const pick = (target: Target = {}) => { pickedTarget.current = target; picker.current?.click(); };
  return (
    <UploadContext.Provider value={{ upload, pick, currentFolder, setCurrentFolder }}>
      {children}
      <input ref={picker} type="file" multiple className="hidden" aria-label={t.uploads} onChange={(e) => {
        for (const file of Array.from(e.target.files ?? [])) void upload(file, pickedTarget.current).catch(() => {});
        e.target.value = "";
      }} />
      {entries.length > 0 && (
        <section aria-label={t.uploads} className="fixed right-4 bottom-4 z-40 w-80 max-w-full rounded-lg border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h2 className="text-sm">{t.uploads}</h2>
            <Button variant="ghost" size="sm" onClick={() => setEntries((old) => old.filter((e) => e.state === "uploading"))}>{t.clear}</Button>
          </div>
          <ul className="max-h-72 overflow-y-auto p-3">
            {entries.map((entry) => (
              <li key={entry.id} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm" title={entry.file.name}>{entry.file.name}</span>
                  {entry.state === "uploading" && <Button variant="ghost" size="icon-sm" aria-label={`${t.cancel} ${entry.file.name}`} onClick={() => requests.current.get(entry.id)?.abort()}><X /></Button>}
                </div>
                <div aria-live="polite" className="text-xs text-muted-foreground">
                  {entry.state === "uploading" ? `${entry.progress}%` : entry.state === "done" ? t.uploaded : entry.state === "canceled" ? t.canceled : entry.error}
                </div>
                {entry.state === "uploading" && <progress aria-label={entry.file.name} value={entry.progress} max={100} className="h-1 w-full accent-primary" />}
                {entry.state === "error" && <Button variant="link" size="sm" className="px-0" onClick={() => entry.file.size > MAX_UPLOAD ? pick(entry.target) : void upload(entry.file, entry.target).catch(() => {})}>{entry.file.size > MAX_UPLOAD ? t.chooseOther : t.retry}</Button>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </UploadContext.Provider>
  );
}

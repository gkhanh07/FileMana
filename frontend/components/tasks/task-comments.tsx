"use client";
/* eslint-disable @next/next/no-img-element -- signed thumbnails need the browser's session cookie. */

import { useRef, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { Ellipsis, Loader2, Paperclip, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useUploads } from "@/components/files/upload-provider";
import { UserAvatar } from "@/components/shell/user-avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { keptMentions, splitMentions, type Comment, type CommentsPage } from "@/lib/comments";
import { fileIcon, fileKind, rawUrl, type Item } from "@/lib/files";
import { formatDate, formatRelative, formatTime } from "@/lib/format";
import type { Person } from "@/lib/projects";
import { strings } from "@/lib/strings";
import type { TaskDetail } from "@/lib/tasks";
import { MentionTextarea } from "./mention-textarea";
import { activityKey, myTasksKey, saveError, taskKey, tasksKey } from "./task-row";

const c = strings.comments;
const PAGE = 20;
export const commentsKey = (taskId: string) => ["comments", taskId];
type Pages = InfiniteData<CommentsPage, number>;

// ponytail: one /me call per session for "is this my comment"; pass `me` down if the panel ever gets it.
const useMe = () => useQuery({ queryKey: ["me"], queryFn: () => api<Person>("/me"), staleTime: Infinity });

/** The counts in the list, board and Activity tab follow a new or deleted comment. */
function refreshTask(qc: QueryClient, task: TaskDetail, delta: number) {
  qc.setQueryData<TaskDetail>(taskKey(task.key), (x) => x && { ...x, commentCount: x.commentCount + delta });
  void qc.invalidateQueries({ queryKey: tasksKey(task.projectId) });
  void qc.invalidateQueries({ queryKey: myTasksKey });
  void qc.invalidateQueries({ queryKey: activityKey(task.id) });
}

// FR-TASK-19: the Comments tab. Pages come newest first; shown oldest at the top.
export function CommentList({ task, timeZone, readOnly }: { task: TaskDetail; timeZone: string; readOnly: boolean }) {
  const me = useMe();
  const query = useInfiniteQuery({
    queryKey: commentsKey(task.id),
    queryFn: ({ pageParam }) => api<CommentsPage>(`/tasks/${task.id}/comments?offset=${pageParam}&limit=${PAGE}`),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.reduce((n, p) => n + p.items.length, 0) : undefined),
  });
  const items = (query.data?.pages.flatMap((p) => p.items) ?? []).toReversed();

  if (query.isPending) return <Skeleton className="h-16 w-full" />;
  if (query.isError)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {c.loadFailed}
        <Button variant="link" size="sm" onClick={() => query.refetch()}>
          {strings.tasks.detail.retry}
        </Button>
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      {query.hasNextPage && (
        <Button
          variant="link"
          size="sm"
          className="self-start px-0 text-muted-foreground"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {c.older}
        </Button>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{c.empty}</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {items.map((x) => (
            <CommentItem key={x.id} comment={x} task={task} timeZone={timeZone} own={!readOnly && x.author.id === me.data?.id} />
          ))}
        </ol>
      )}
    </div>
  );
}

function CommentItem({ comment, task, timeZone, own }: { comment: Comment; task: TaskDetail; timeZone: string; own: boolean }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const [picked, setPicked] = useState<Person[]>(comment.mentions);
  const replace = (next: Comment | null) =>
    qc.setQueryData<Pages>(commentsKey(task.id), (d) =>
      d && {
        ...d,
        pages: d.pages.map((p) => ({ ...p, items: p.items.flatMap((x) => (x.id !== comment.id ? x : next ?? [])) })),
      },
    );

  // FR-CMT-04
  const save = useMutation({
    mutationFn: (body: string) =>
      api<Comment>(`/comments/${comment.id}`, {
        method: "PATCH",
        body: { body, mentionIds: keptMentions(body, picked).map((p) => p.id) },
      }),
    onSuccess: (next) => {
      replace(next);
      setDraft(null);
    },
    onError: saveError,
  });
  const remove = useMutation({
    mutationFn: () => api(`/comments/${comment.id}`, { method: "DELETE" }),
    onSuccess: () => {
      replace(null);
      refreshTask(qc, task, -1);
      toast.success(c.deleted, {
        action: {
          label: strings.tasks.detail.undo,
          onClick: () =>
            api(`/comments/${comment.id}/restore`, { method: "POST" }).then(() => {
              void qc.invalidateQueries({ queryKey: commentsKey(task.id) });
              refreshTask(qc, task, 1);
            }, saveError),
        },
      });
    },
    onError: saveError,
  });
  const submit = () => {
    const body = draft?.trim() ?? "";
    if ((body || comment.attachments.length) && !save.isPending) save.mutate(body);
  };

  return (
    <li id={`comment-${comment.id}`} className="flex gap-2 text-sm">
      <UserAvatar user={comment.author} className="mt-0.5 size-6 text-xs" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex h-6 items-center gap-2">
          <span className="font-medium">{comment.author.name}</span>
          <time
            dateTime={comment.createdAt}
            title={`${formatDate(comment.createdAt, timeZone)} ${formatTime(comment.createdAt, timeZone)}`}
            className="text-xs text-muted-foreground"
          >
            {formatRelative(comment.createdAt, timeZone)}
          </time>
          {comment.editedAt && <span className="text-xs text-muted-foreground">({c.edited})</span>}
          {own && draft === null && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label={c.actions} className="ml-auto">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setDraft(comment.body)}>
                  <Pencil />
                  {c.edit}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" disabled={remove.isPending} onSelect={() => remove.mutate()}>
                  <Trash2 />
                  {c.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {draft !== null ? (
          <div className="flex flex-col gap-2">
            <MentionTextarea
              aria-label={c.edit}
              autoFocus
              maxLength={10000}
              value={draft}
              onChange={setDraft}
              onMention={(p) => setPicked((old) => [...old, p])}
              onSubmit={submit}
              onCancel={() => setDraft(null)}
              memberIds={task.project.memberIds}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
                {c.cancel}
              </Button>
              <Button size="sm" disabled={save.isPending} onClick={submit}>
                {c.save}
              </Button>
            </div>
          </div>
        ) : (
          comment.body && (
            <p className="break-words whitespace-pre-wrap">
              {splitMentions(comment.body, comment.mentions).map((part, i) =>
                part.person ? (
                  <span key={i} className="font-medium text-primary">
                    {part.text}
                  </span>
                ) : (
                  part.text
                ),
              )}
            </p>
          )
        )}
        {comment.attachments.length > 0 && <Files items={comment.attachments} />}
      </div>
    </li>
  );
}

function Files({ items }: { items: Item[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = fileIcon(item);
        return (
          <li key={item.id}>
            <Link href={`/docs/${item.id}`} className="flex items-center gap-2 rounded-md border p-1.5 text-xs hover:bg-accent">
              {fileKind(item.name) === "image" && item.url ? (
                <img src={rawUrl(item.url)} alt={item.name} className="size-16 rounded-sm object-cover" />
              ) : (
                <>
                  <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  <span className="max-w-40 truncate">{item.name}</span>
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type Pending = { key: string; name: string; item?: Item };

// FR-CMT-01..03: pinned under the panel's scrolling part. Files go up to the task first,
// then the comment takes them.
export function CommentComposer({ task, onSent }: { task: TaskDetail; onSent: () => void }) {
  const qc = useQueryClient();
  const { upload } = useUploads();
  const picker = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<Person[]>([]);
  const [files, setFiles] = useState<Pending[]>([]);
  const uploading = files.some((f) => !f.item);

  const add = (list: FileList | File[]) => {
    for (const file of Array.from(list)) {
      const key = crypto.randomUUID();
      setFiles((old) => [...old, { key, name: file.name || "image.png" }]);
      // A failed upload shows its error in the upload tray.
      upload(file, { taskId: task.id }).then(
        (item) => setFiles((old) => old.map((f) => (f.key === key ? { ...f, item } : f))),
        () => setFiles((old) => old.filter((f) => f.key !== key)),
      );
    }
  };

  const send = useMutation({
    mutationFn: (text: string) =>
      api<Comment>(`/tasks/${task.id}/comments`, {
        method: "POST",
        body: {
          body: text,
          mentionIds: keptMentions(text, picked).map((p) => p.id),
          attachmentIds: files.flatMap((f) => f.item?.id ?? []),
        },
      }),
    onSuccess: (comment) => {
      qc.setQueryData<Pages>(commentsKey(task.id), (d) =>
        d && { ...d, pages: d.pages.map((p, i) => (i ? p : { ...p, items: [comment, ...p.items] })) },
      );
      refreshTask(qc, task, 1);
      setBody("");
      setPicked([]);
      setFiles([]);
      onSent();
      requestAnimationFrame(() => document.getElementById(`comment-${comment.id}`)?.scrollIntoView({ block: "nearest" }));
    },
    onError: saveError,
  });
  const ready = !uploading && !send.isPending && (body.trim() !== "" || files.length > 0);
  const submit = () => {
    if (ready) send.mutate(body.trim());
  };

  return (
    <div className="sticky bottom-0 flex shrink-0 flex-col gap-2 border-t bg-background px-6 py-3">
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {files.map((f) => (
            <li key={f.key} className="flex h-7 items-center gap-1 rounded-md border pr-0.5 pl-2 text-xs">
              {!f.item && <Loader2 aria-label={c.uploading} className="size-3.5 animate-spin" />}
              <span className="max-w-40 truncate">{f.name}</span>
              {/* ponytail: the file stays on the task, only leaves this comment. */}
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={c.removeFile(f.name)}
                disabled={!f.item}
                onClick={() => setFiles((old) => old.filter((x) => x.key !== f.key))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <MentionTextarea
        aria-label={c.label}
        placeholder={c.placeholder}
        maxLength={10000}
        value={body}
        onChange={setBody}
        onMention={(p) => setPicked((old) => [...old, p])}
        onSubmit={submit}
        onPaste={(e) => {
          if (e.clipboardData.files.length) {
            e.preventDefault();
            add(e.clipboardData.files);
          }
        }}
        memberIds={task.project.memberIds}
      />
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" aria-label={c.attach} onClick={() => picker.current?.click()}>
          <Paperclip />
        </Button>
        <input
          ref={picker}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            add(e.target.files ?? []);
            e.target.value = "";
          }}
        />
        <Button size="sm" disabled={!ready} onClick={submit}>
          {c.send}
        </Button>
      </div>
    </div>
  );
}

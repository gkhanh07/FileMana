"use client";

import { useId, useRef, useState } from "react";
import { UserAvatar } from "@/components/shell/user-avatar";
import { Textarea } from "@/components/ui/textarea";
import { mentionAt, suggest } from "@/lib/comments";
import type { Person } from "@/lib/projects";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { usePeople } from "./task-row";

const c = strings.comments;

export function MentionTextarea({
  value,
  onChange,
  onMention,
  onSubmit,
  onCancel,
  memberIds,
  ...props
}: Omit<React.ComponentProps<"textarea">, "value" | "onChange" | "onSubmit"> & {
  value: string;
  onChange: (value: string) => void;
  onMention: (person: Person) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  memberIds: string[];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [closedAt, setClosedAt] = useState<number | null>(null);
  const people = usePeople();

  const at = mentionAt(value, caret);
  const options = at && at.start !== closedAt ? suggest(people.data ?? [], at.query, memberIds) : [];
  const open = options.length > 0;
  const current = Math.min(active, options.length - 1);

  const pick = (p: Person) => {
    if (!at) return;
    const insert = `@${p.name} `;
    const next = value.slice(0, at.start) + insert + value.slice(caret);
    const pos = at.start + insert.length;
    onChange(next);
    onMention(p);
    setCaret(pos);
    requestAnimationFrame(() => ref.current?.setSelectionRange(pos, pos));
  };

  return (
    <div className="relative">
      <Textarea
        {...props}
        ref={ref}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${current}` : undefined}
        className="max-h-48 resize-none"
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart);
          setActive(0);
        }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSubmit();
          } else if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setActive((current + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
          } else if (open && (e.key === "Enter" || e.key === "Tab")) {
            e.preventDefault();
            pick(options[current]);
          } else if (e.key === "Escape" && (open || onCancel)) {
            e.preventDefault();
            if (open) setClosedAt(at!.start);
            else onCancel?.();
          }
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={c.people}
          className="absolute bottom-full left-0 z-10 mb-1 w-64 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {options.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === current}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              className={cn("flex h-8 cursor-default items-center gap-2 rounded-sm px-2 text-sm", i === current && "bg-accent")}
            >
              <UserAvatar user={p} className="size-5 text-[10px]" />
              <span className="truncate">{p.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

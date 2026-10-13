"use client";

import "@blocknote/shadcn/style.css";
import type { PartialBlock } from "@blocknote/core";
import { vi } from "@blocknote/core/locales";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "next-themes";

// FR-TASK-16 (D7: BlockNote). Loaded only in the browser, through next/dynamic.
// ponytail: image and file blocks only embed a URL until uploads arrive (F12).
export default function TaskEditor({
  initial,
  editable,
  onChange,
}: {
  initial: unknown[] | null;
  editable: boolean;
  onChange: (doc: unknown[]) => void;
}) {
  const editor = useCreateBlockNote({
    dictionary: vi,
    // An empty document is undefined, not [].
    initialContent: initial?.length ? (initial as PartialBlock[]) : undefined,
  });
  const { resolvedTheme } = useTheme();
  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      onChange={() => onChange(editor.document)}
    />
  );
}

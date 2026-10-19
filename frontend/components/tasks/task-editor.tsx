"use client";

import "@blocknote/shadcn/style.css";
import type { PartialBlock } from "@blocknote/core";
import { vi } from "@blocknote/core/locales";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "next-themes";

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

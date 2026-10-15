"use client";
import { FilesError } from "@/components/files/file-states";
export default function Error({ reset }: { reset: () => void }) { return <div className="p-6"><FilesError retry={reset} /></div>; }

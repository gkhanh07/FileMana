import { strings } from "@/lib/strings";

// Holds a project tab until its feature is built.
export function TabPlaceholder() {
  return <p className="text-sm text-muted-foreground">{strings.projects.comingSoon}</p>;
}

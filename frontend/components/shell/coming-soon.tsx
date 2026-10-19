import { strings } from "@/lib/strings";

export function ComingSoon({ title }: { title: string }) {
  return (
    <main className="flex flex-1 flex-col gap-2 p-6">
      <h1 className="text-2xl">{title}</h1>
      <p className="text-sm text-muted-foreground">{strings.comingSoon}</p>
    </main>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl">{strings.notFound.title}</h1>
      <p className="text-sm text-muted-foreground">{strings.notFound.message}</p>
      <Button asChild>
        <Link href="/">{strings.notFound.home}</Link>
      </Button>
    </main>
  );
}

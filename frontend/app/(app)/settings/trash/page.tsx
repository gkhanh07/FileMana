import { getWorkspace } from "@/lib/api/server";
import { strings } from "@/lib/strings";
import { TrashList } from "./trash-list";

export default async function TrashPage() {
  const workspace = await getWorkspace();
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl">{strings.trash.title}</h1>
        <p className="text-sm text-muted-foreground">{strings.trash.intro}</p>
      </div>
      <div className="max-w-4xl">
        <TrashList timeZone={workspace.timezone} />
      </div>
    </main>
  );
}

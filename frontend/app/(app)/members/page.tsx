import { getMe, serverApi } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import { strings } from "@/lib/strings";
import { MembersTable } from "./members-table";

// FR-SET-06, FR-AUTH-02
export default async function MembersPage() {
  const [me, members] = await Promise.all([
    getMe(),
    serverApi<components["schemas"]["MemberDto"][]>("/members"),
  ]);
  return (
    <main className="flex flex-1 flex-col gap-8 p-6">
      <h1 className="text-2xl">{strings.nav.members}</h1>
      <div className="max-w-4xl">
        <MembersTable members={members} meId={me.id} />
      </div>
    </main>
  );
}

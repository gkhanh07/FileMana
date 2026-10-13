import { getMe } from "@/lib/api/server";
import { strings } from "@/lib/strings";

// Placeholder landing page; the real Home arrives with F7.
export default async function Home() {
  const me = await getMe();
  return (
    <main className="flex flex-1 flex-col items-start gap-4 p-6">
      <h1 className="font-heading text-3xl">{strings.home.greeting(me.name)}</h1>
    </main>
  );
}

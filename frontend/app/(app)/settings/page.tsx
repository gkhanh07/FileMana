import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMe } from "@/lib/api/server";
import { strings } from "@/lib/strings";
import { PasswordForm, ProfileForm, SignOutOthers } from "./personal-settings";

// FR-SET-01, FR-SET-02, FR-SET-13 (Trash has its own page)
export default async function SettingsPage() {
  const me = await getMe();
  return (
    <main className="flex flex-1 flex-col gap-8 p-6">
      <h1 className="text-2xl">{strings.nav.settings}</h1>
      <div className="flex max-w-lg flex-col gap-10">
        <ProfileForm user={me} />
        <PasswordForm />
        <SignOutOthers />
        <section className="flex flex-col items-start gap-3">
          <h2 className="text-lg">{strings.trash.title}</h2>
          <p className="text-sm text-muted-foreground">{strings.trash.intro}</p>
          <Button variant="outline" asChild>
            <Link href="/settings/trash">
              <Trash2 />
              {strings.trash.open}
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}

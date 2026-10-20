import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMe, getWorkspace } from "@/lib/api/server";
import { strings } from "@/lib/strings";
import { PasswordForm, ProfileForm, SignOutOthers } from "./personal-settings";
import { WorkspaceForm } from "./workspace-settings";

export default async function SettingsPage() {
  const [me, workspace] = await Promise.all([getMe(), getWorkspace()]);
  return (
    <main className="flex flex-1 flex-col gap-8 p-6">
      <h1 className="text-2xl">{strings.nav.settings}</h1>
      <div className="flex max-w-lg flex-col gap-10">
        <ProfileForm user={me} />
        <PasswordForm />
        <SignOutOthers />
        <WorkspaceForm workspace={workspace} />
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

import { getMe } from "@/lib/api/server";
import { strings } from "@/lib/strings";
import { PasswordForm, ProfileForm, SignOutOthers } from "./personal-settings";

// FR-SET-01, FR-SET-02
export default async function SettingsPage() {
  const me = await getMe();
  return (
    <main className="flex flex-1 flex-col gap-8 p-6">
      <h1 className="text-2xl">{strings.nav.settings}</h1>
      <div className="flex max-w-lg flex-col gap-10">
        <ProfileForm user={me} />
        <PasswordForm />
        <SignOutOthers />
      </div>
    </main>
  );
}

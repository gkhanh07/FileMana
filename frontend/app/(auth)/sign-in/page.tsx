import { strings } from "@/lib/strings";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-3xl">{strings.appName}</h1>
        <h2 className="mt-6 text-lg font-semibold">{strings.signIn.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{strings.signIn.subtitle}</p>
        <SignInForm />
      </div>
    </main>
  );
}

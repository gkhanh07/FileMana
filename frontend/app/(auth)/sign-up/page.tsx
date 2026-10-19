import Link from "next/link";
import { strings } from "@/lib/strings";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-3xl">{strings.appName}</h1>
        <h2 className="mt-6 text-lg font-semibold">{strings.signUp.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{strings.signUp.subtitle}</p>
        <SignUpForm />
        <p className="mt-6 text-sm text-muted-foreground">
          {strings.signUp.haveAccount}{" "}
          <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
            {strings.signIn.submit}
          </Link>
        </p>
      </div>
    </main>
  );
}

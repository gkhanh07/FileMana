"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type User } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { errorMessage, strings } from "@/lib/strings";

const t = strings.signUp;

export function SignUpForm() {
  const router = useRouter();
  const signUp = useMutation({
    mutationFn: (body: { email: string; name: string; password: string }) =>
      api<User>("/auth/signup", { method: "POST", body }),
    onSuccess: () => {
      router.replace("/");
      router.refresh();
    },
  });

  return (
    <form
      className="mt-6 flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        signUp.mutate({
          email: String(form.get("email")),
          name: String(form.get("name")),
          password: String(form.get("password")),
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-email">{strings.signIn.email}</Label>
        <Input id="signup-email" name="email" type="email" autoComplete="email" required maxLength={254} autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-name">{t.name}</Label>
        <Input id="signup-name" name="name" autoComplete="name" required maxLength={100} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-password">{strings.signIn.password}</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={200}
          aria-describedby="passwordHint"
        />
        <p id="passwordHint" className="text-xs text-muted-foreground">
          {t.passwordHint}
        </p>
      </div>
      {signUp.error && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(signUp.error instanceof ApiError ? signUp.error.code : undefined)}
        </p>
      )}
      <Button type="submit" disabled={signUp.isPending}>
        {signUp.isPending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

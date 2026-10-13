"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, type User } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { errorMessage, strings } from "@/lib/strings";

export function SignInForm() {
  const router = useRouter();
  const [remember, setRemember] = useState(false);
  const signIn = useMutation({
    mutationFn: (body: { email: string; password: string; remember: boolean }) =>
      api<User>("/auth/login", { method: "POST", body }),
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
        signIn.mutate({
          email: String(form.get("email")),
          password: String(form.get("password")),
          remember,
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{strings.signIn.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{strings.signIn.password}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
        <Label htmlFor="remember">{strings.signIn.remember}</Label>
      </div>
      {signIn.error && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(signIn.error instanceof ApiError ? signIn.error.code : undefined)}
        </p>
      )}
      <Button type="submit" disabled={signIn.isPending}>
        {signIn.isPending ? strings.signIn.submitting : strings.signIn.submit}
      </Button>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { errorMessage, strings } from "@/lib/strings";

export function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const leave = () => {
    queryClient.clear(); // nothing cached for this user may show for the next one
    router.replace("/sign-in");
    router.refresh();
  };
  const signOut = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: leave,
    // Already signed out (expired session): the goal is reached.
    onError: (e) =>
      e instanceof ApiError && e.statusCode === 401 ? leave() : toast.error(errorMessage(e instanceof ApiError ? e.code : undefined)),
  });
  return (
    <Button variant="outline" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
      {strings.signOut}
    </Button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, type User } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { errorMessage, strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

export function UserMenu({ user, collapsed }: { user: User; collapsed: boolean }) {
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
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={strings.nav.account}
        className={cn(
          "flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          collapsed && "mx-auto w-9 justify-center px-0",
        )}
      >
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
          {user.name.charAt(0).toUpperCase()}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate font-medium">{user.name}</span>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={signOut.isPending} onSelect={() => signOut.mutate()}>
          <LogOut />
          {strings.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

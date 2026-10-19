"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, type Theme, type User } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { errorMessage, strings } from "@/lib/strings";

const themes: Theme[] = ["light", "dark", "system"];

export function ThemeSync({ theme }: { theme: Theme }) {
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  return null;
}

export function useSaveTheme() {
  const { theme, setTheme } = useTheme();
  return useMutation({
    mutationFn: (next: Theme) => api<User>("/me", { method: "PATCH", body: { theme: next } }),
    onMutate: (next) => {
      const previous = theme;
      setTheme(next);
      return { previous };
    },
    onError: (e, _next, ctx) => {
      if (ctx?.previous) setTheme(ctx.previous);
      toast.error(errorMessage(e instanceof ApiError ? e.code : undefined));
    },
  });
}

export function ThemeMenu() {
  const { theme } = useTheme();
  const save = useSaveTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={strings.topbar.theme}>
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{strings.topbar.theme}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => save.mutate(v as Theme)}>
          {themes.map((t) => (
            <DropdownMenuRadioItem key={t} value={t}>
              {strings.topbar.themes[t]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

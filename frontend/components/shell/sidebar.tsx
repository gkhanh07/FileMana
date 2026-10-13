"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { User } from "@/lib/api/client";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { isActive, mainNav, settingsNav, SIDEBAR_COOKIE, type NavItem } from "./nav";
import { UserMenu } from "./user-menu";

// FR-SHELL-01, FR-SHELL-02: 240px sidebar that collapses into a 56px icon rail.
export function Sidebar({
  workspaceName,
  user,
  defaultCollapsed,
}: {
  workspaceName: string;
  user: User;
  defaultCollapsed: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const pathname = usePathname();

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? 1 : 0}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "sticky top-0 flex h-svh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground",
          collapsed ? "w-14 items-center" : "w-60",
        )}
      >
        <div className={cn("flex h-13 shrink-0 items-center gap-2.5", !collapsed && "pr-2 pl-4")}>
          {!collapsed && (
            <>
              <span
                aria-hidden
                className="grid size-6 shrink-0 place-items-center rounded-sm bg-primary font-heading text-sm text-primary-foreground"
              >
                {workspaceName.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 truncate font-medium">{workspaceName}</span>
            </>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggle}
            aria-label={collapsed ? strings.nav.expand : strings.nav.collapse}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>

        <nav aria-label={strings.nav.label} className="flex flex-col gap-0.5 px-2 py-1">
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href, pathname)} collapsed={collapsed} />
          ))}
        </nav>

        {/* FR-SHELL-03: pinned projects arrive with the Projects feature. */}
        {!collapsed && (
          <div className="flex flex-col gap-1 px-2 pt-4">
            <h2 className="px-2 font-sans text-xs font-medium text-muted-foreground">{strings.nav.favorites}</h2>
            <p className="px-2 text-xs text-muted-foreground">{strings.nav.favoritesEmpty}</p>
          </div>
        )}

        <div className={cn("mt-auto flex w-full flex-col gap-0.5 p-2", collapsed && "items-center")}>
          <NavLink item={settingsNav} active={isActive(settingsNav.href, pathname)} collapsed={collapsed} />
          <div className="mt-1 w-full border-t pt-1">
            <UserMenu user={user} collapsed={collapsed} />
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "relative flex h-8 items-center gap-2.5 rounded-md px-2 text-sm outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        collapsed && "w-9 justify-center px-0",
        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary" />}
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { logoSrc, type User, type Workspace } from "@/lib/api/client";
import type { Favorite } from "@/lib/projects";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { isActive, mainNav, settingsNav, SIDEBAR_COOKIE, type NavItem } from "./nav";
import { Favorites } from "./favorites";
import { UserMenu } from "./user-menu";

const NARROW = "(max-width: 1279px)";
function subscribeNarrow(onChange: () => void) {
  const query = matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function Sidebar({
  workspace,
  user,
  favorites,
  defaultCollapsed,
}: {
  workspace: Workspace;
  user: User;
  favorites: Favorite[];
  defaultCollapsed: boolean;
}) {
  const [savedCollapsed, setCollapsed] = useState(defaultCollapsed);
  const narrow = useSyncExternalStore(subscribeNarrow, () => matchMedia(NARROW).matches, () => false);
  const collapsed = savedCollapsed || narrow;
  const pathname = usePathname();

  const toggle = () => {
    const next = !savedCollapsed;
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
              <WorkspaceMark workspace={workspace} />
              <span className="flex-1 truncate font-medium">{workspace.name}</span>
            </>
          )}
          {narrow ? (
            <WorkspaceMark workspace={workspace} />
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggle}
              aria-label={collapsed ? strings.nav.expand : strings.nav.collapse}
              aria-expanded={!collapsed}
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
          )}
        </div>

        <nav aria-label={strings.nav.label} className="flex flex-col gap-0.5 px-2 py-1">
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href, pathname)} collapsed={collapsed} />
          ))}
        </nav>

        <Favorites favorites={favorites} collapsed={collapsed} />

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

function WorkspaceMark({ workspace }: { workspace: Workspace }) {
  const src = logoSrc(workspace);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="size-6 shrink-0 rounded-sm object-contain" />;
  }
  return (
    <span
      aria-hidden
      className="grid size-6 shrink-0 place-items-center rounded-sm bg-primary font-heading text-sm text-primary-foreground"
    >
      {workspace.name.charAt(0).toUpperCase()}
    </span>
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
        active && "bg-primary/10 font-medium text-primary",
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

import { Files, FolderKanban, House, Inbox, Settings, SquareCheckBig, type LucideIcon } from "lucide-react";
import { strings } from "@/lib/strings";

// FR-SHELL-02: read by the server layout so the first paint already has the right width.
export const SIDEBAR_COOKIE = "sidebar_collapsed";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const mainNav: NavItem[] = [
  { href: "/", label: strings.nav.home, icon: House },
  { href: "/my-tasks", label: strings.nav.myTasks, icon: SquareCheckBig },
  { href: "/inbox", label: strings.nav.inbox, icon: Inbox },
  { href: "/projects", label: strings.nav.projects, icon: FolderKanban },
  { href: "/docs", label: strings.nav.docs, icon: Files },
];

export const settingsNav: NavItem = { href: "/settings", label: strings.nav.settings, icon: Settings };

export const isActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

import { Files, FolderKanban, House, Settings, SquareCheckBig, Users, type LucideIcon } from "lucide-react";
import { strings } from "@/lib/strings";

export const SIDEBAR_COOKIE = "sidebar_collapsed";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const mainNav: NavItem[] = [
  { href: "/", label: strings.nav.home, icon: House },
  { href: "/my-tasks", label: strings.nav.myTasks, icon: SquareCheckBig },
  { href: "/projects", label: strings.nav.projects, icon: FolderKanban },
  { href: "/docs", label: strings.nav.docs, icon: Files },
  { href: "/members", label: strings.nav.members, icon: Users },
];

export const settingsNav: NavItem = { href: "/settings", label: strings.nav.settings, icon: Settings };

export const isActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

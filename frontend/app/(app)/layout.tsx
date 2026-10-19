import { Suspense } from "react";
import { cookies } from "next/headers";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorReporter } from "@/components/shell/error-reporter";
import { SIDEBAR_COOKIE } from "@/components/shell/nav";
import { OfflineBar } from "@/components/shell/offline-bar";
import { Sidebar } from "@/components/shell/sidebar";
import { ThemeSync } from "@/components/shell/theme-menu";
import { Topbar } from "@/components/shell/topbar";
import { getMe, getWorkspace, serverApi } from "@/lib/api/server";
import type { Favorite } from "@/lib/projects";
import { SessionRefresh } from "./session-refresh";

async function AuthGate({ children }: { children: React.ReactNode }) {
  const me = await getMe(); // first, so a 401 redirects before another call fails
  const [workspace, favorites] = await Promise.all([getWorkspace(), serverApi<Favorite[]>("/me/favorites")]);
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";
  return (
    <div className="flex flex-1">
      <SessionRefresh />
      <ThemeSync theme={me.theme} />
      <ErrorReporter />
      <Sidebar workspaceName={workspace.name} user={me} favorites={favorites} defaultCollapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBar />
        <Topbar me={me} timeZone={workspace.timezone} />
        {children}
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex flex-1">
      <div className="w-60 shrink-0 border-r bg-sidebar" />
      <div className="flex flex-1 flex-col">
        <div className="h-13 border-b" />
        <Skeleton className="m-6 h-8 w-64" />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}

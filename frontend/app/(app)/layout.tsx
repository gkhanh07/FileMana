import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getMe } from "@/lib/api/server";
import { SessionRefresh } from "./session-refresh";

// Everything under (app) needs a session. The API decides; getMe redirects on its 401.
async function AuthGate({ children }: { children: React.ReactNode }) {
  await getMe();
  return (
    <>
      <SessionRefresh />
      {children}
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-8 w-64" />}>
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}

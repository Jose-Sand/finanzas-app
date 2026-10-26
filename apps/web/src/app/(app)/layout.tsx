import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";

// Everything under here is personal, live data rendered on the client;
// the prerendered shell is just the loading state.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

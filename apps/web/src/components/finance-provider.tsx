"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { friendlyError, indexBy, loadCore, type Account, type Category, type CoreData } from "@caudal/shared";
import { supabaseBrowser } from "@/lib/supabase/client";

interface FinanceCtx {
  data: CoreData | null;
  error: string | null;
  accountsById: Map<string, Account>;
  categoriesById: Map<string, Category>;
  /** Bumps after any mutation so pages can reload their own queries. */
  version: number;
  refresh: () => Promise<void>;
  toast: (message: string, tone?: "ok" | "error") => void;
}

const Ctx = createContext<FinanceCtx | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CoreData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [toastState, setToast] = useState<{ message: string; tone: "ok" | "error"; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const next = await loadCore(supabaseBrowser());
      setData(next);
      setError(null);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(friendlyError(e));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    loadCore(supabaseBrowser())
      .then((next) => {
        if (!alive) return;
        setData(next);
        setVersion((v) => v + 1);
      })
      .catch((e) => alive && setError(friendlyError(e)));
    return () => {
      alive = false;
    };
  }, []);

  const toast = useCallback((message: string, tone: "ok" | "error" = "ok") => {
    clearTimeout(timer.current);
    setToast({ message, tone, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const value = useMemo<FinanceCtx>(
    () => ({
      data,
      error,
      version,
      refresh,
      toast,
      accountsById: indexBy(data?.accounts ?? []),
      categoriesById: indexBy(data?.categories ?? []),
    }),
    [data, error, version, refresh, toast],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-8">
        {toastState ? (
          <div
            key={toastState.id}
            className={`animate-sheet pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-card ${
              toastState.tone === "error" ? "bg-expense text-white" : "bg-ink text-bg"
            }`}
          >
            {toastState.message}
          </div>
        ) : null}
      </div>
    </Ctx.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
}

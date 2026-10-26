"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ArrowLeftRight, Goal, LayoutGrid, LogOut, PieChart, Plus, Repeat, Settings, Wallet } from "lucide-react";
import type { Transaction, TransactionKind } from "@caudal/shared";
import { supabaseBrowser } from "@/lib/supabase/client";
import { FinanceProvider, useFinance } from "./finance-provider";
import { TransactionSheet, type TxSheetState } from "./transaction-sheet";
import { Button, cx, Logo } from "./ui";

const NAV = [
  { href: "/panel", label: "Resumen", icon: LayoutGrid },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/presupuestos", label: "Presupuestos", icon: PieChart },
  { href: "/metas", label: "Metas", icon: Goal },
  { href: "/recurrentes", label: "Recurrentes", icon: Repeat },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

const MOBILE_NAV = [NAV[0], NAV[1], NAV[3], NAV[2]] as const;

const TxCtx = createContext<{ openTx: (opts?: { editing?: Transaction; kind?: TransactionKind }) => void } | null>(null);

export function useTxSheet() {
  const ctx = useContext(TxCtx);
  if (!ctx) throw new Error("useTxSheet must be used inside AppShell");
  return ctx;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <FinanceProvider>
      <ShellInner>{children}</ShellInner>
    </FinanceProvider>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { data, error } = useFinance();
  const [sheet, setSheet] = useState<TxSheetState>({ open: false });

  const openTx = useCallback((opts?: { editing?: Transaction; kind?: TransactionKind }) => {
    setSheet({ open: true, editing: opts?.editing, kind: opts?.kind });
  }, []);
  const close = useCallback(() => setSheet({ open: false }), []);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace("/entrar");
    router.refresh();
  }

  const active = (href: string) => path === href || path.startsWith(`${href}/`);

  return (
    <TxCtx.Provider value={{ openTx }}>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
          <Link href="/panel" className="px-3">
            <Logo />
          </Link>
          <Button variant="primary" className="mx-1 mt-8" onClick={() => openTx()}>
            <Plus className="size-4" /> Registrar movimiento
          </Button>
          <nav className="mt-6 flex flex-col gap-0.5" aria-label="Principal">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={cx(
                  "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] transition-colors",
                  active(href) ? "bg-surface font-medium text-ink shadow-card" : "text-muted hover:bg-surface-alt hover:text-ink",
                )}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t border-line pt-4">
            <p className="truncate px-3 text-sm font-medium">{data?.profile.full_name ?? " "}</p>
            <button onClick={signOut} className="mt-1 flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm text-muted hover:bg-surface-alt hover:text-ink">
              <LogOut className="size-4" /> Salir
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
            <Logo className="text-lg" />
            <Link href="/ajustes" aria-label="Ajustes" className="rounded-full p-2 text-muted hover:bg-surface-alt">
              <Settings className="size-5" />
            </Link>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:px-10 md:pb-12 md:pt-10">
            {error && !data ? (
              <div className="rounded-2xl border border-expense/40 bg-surface p-6">
                <p className="font-medium text-expense">No pudimos cargar tus datos.</p>
                <p className="mt-1 text-muted">{error}</p>
              </div>
            ) : !data ? (
              <ShellSkeleton />
            ) : (
              children
            )}
          </main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Principal">
          {MOBILE_NAV.slice(0, 2).map(({ href, label, icon: Icon }) => (
            <MobileTab key={href} href={href} label={label} active={active(href)} icon={<Icon className="size-5" />} />
          ))}
          <div className="flex items-center justify-center">
            <button onClick={() => openTx()} aria-label="Registrar movimiento" className="-mt-6 grid size-14 place-items-center rounded-full bg-mango text-mango-ink shadow-card">
              <Plus className="size-6" />
            </button>
          </div>
          {MOBILE_NAV.slice(2).map(({ href, label, icon: Icon }) => (
            <MobileTab key={href} href={href} label={label} active={active(href)} icon={<Icon className="size-5" />} />
          ))}
        </nav>
      </div>
      <TransactionSheet state={sheet} onClose={close} />
    </TxCtx.Provider>
  );
}

function MobileTab({ href, label, icon, active }: { href: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cx("flex flex-col items-center gap-1 py-2.5 text-[11px]", active ? "text-ink font-medium" : "text-faint")}>
      {icon}
      {label}
    </Link>
  );
}

function ShellSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Cargando">
      <div className="h-9 w-48 rounded-lg bg-surface-alt" />
      <div className="h-40 rounded-2xl bg-surface-alt" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-64 rounded-2xl bg-surface-alt" />
        <div className="h-64 rounded-2xl bg-surface-alt" />
      </div>
    </div>
  );
}

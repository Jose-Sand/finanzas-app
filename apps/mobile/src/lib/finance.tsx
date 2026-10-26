import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  friendlyError,
  indexBy,
  loadCore,
  loadTransactions,
  type Account,
  type Category,
  type CoreData,
  type Transaction,
  type TxQuery,
} from '@caudal/shared';
import { supabase } from './supabase';

interface FinanceCtx {
  data: CoreData | null;
  error: string | null;
  loading: boolean;
  version: number;
  accountsById: Map<string, Account>;
  categoriesById: Map<string, Category>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<FinanceCtx | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CoreData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadCore(supabase));
      setError(null);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      data,
      error,
      loading,
      version,
      refresh,
      accountsById: indexBy(data?.accounts ?? []),
      categoriesById: indexBy(data?.categories ?? []),
    }),
    [data, error, loading, version, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinance() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider');
  return ctx;
}

export function useTransactions(query: TxQuery) {
  const { version } = useFinance();
  const [rows, setRows] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(query);

  useEffect(() => {
    let alive = true;
    loadTransactions(supabase, JSON.parse(key) as TxQuery)
      .then((r) => {
        if (alive) {
          setRows(r);
          setError(null);
        }
      })
      .catch((e) => alive && setError(friendlyError(e)));
    return () => {
      alive = false;
    };
  }, [key, version]);

  return { rows, error };
}

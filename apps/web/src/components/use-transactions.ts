"use client";

import { useEffect, useState } from "react";
import { friendlyError, loadTransactions, type Transaction, type TxQuery } from "@caudal/shared";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useFinance } from "./finance-provider";

/** Loads transactions for a query and reloads after any mutation. */
export function useTransactions(query: TxQuery) {
  const { version } = useFinance();
  const [rows, setRows] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(query);

  useEffect(() => {
    let alive = true;
    loadTransactions(supabaseBrowser(), JSON.parse(key) as TxQuery)
      .then((r) => alive && (setRows(r), setError(null)))
      .catch((e) => alive && setError(friendlyError(e)));
    return () => {
      alive = false;
    };
  }, [key, version]);

  return { rows, error, loading: rows === null && !error };
}

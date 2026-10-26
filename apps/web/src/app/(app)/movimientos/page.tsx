"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Plus, Search } from "lucide-react";
import {
  dayLabel,
  monthKey,
  monthLabel,
  monthRange,
  shiftMonth,
  summarize,
  todayISO,
  TRANSACTION_KIND_LABEL,
  type Transaction,
  type TransactionKind,
} from "@caudal/shared";
import { useFinance } from "@/components/finance-provider";
import { useTxSheet } from "@/components/app-shell";
import { TxRow } from "@/components/tx-row";
import { useTransactions } from "@/components/use-transactions";
import { Button, Card, Empty, Input, Money, PageHeader, Select } from "@/components/ui";

export default function MovimientosPage() {
  const { data, accountsById, categoriesById } = useFinance();
  const { openTx } = useTxSheet();
  const current = monthKey(todayISO());
  const [month, setMonth] = useState(current);
  const [kind, setKind] = useState<TransactionKind | "">("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const base = data!.profile.base_currency;

  const range = monthRange(month);
  const { rows, loading, error } = useTransactions({
    from: range.start,
    to: range.end,
    kind: kind || undefined,
    accountId: accountId || undefined,
    categoryId: categoryId || undefined,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!rows || !q) return rows ?? [];
    return rows.filter((t) => {
      const cat = t.category_id ? categoriesById.get(t.category_id)?.name ?? "" : "";
      const acc = accountsById.get(t.account_id)?.name ?? "";
      return `${t.note ?? ""} ${cat} ${acc}`.toLowerCase().includes(q);
    });
  }, [rows, search, categoriesById, accountsById]);

  const groups = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of filtered) m.set(t.occurred_on, [...(m.get(t.occurred_on) ?? []), t]);
    return [...m.entries()];
  }, [filtered]);

  const totals = summarize(filtered, accountsById, base, data!.rates);
  const categories = data!.categories.filter((c) => !kind || kind === "transfer" || c.kind === kind);

  function exportCsv() {
    const header = ["fecha", "tipo", "cuenta", "moneda", "monto", "categoria", "cuenta_destino", "monto_destino", "nota"];
    const lines = filtered.map((t) => {
      const acc = accountsById.get(t.account_id);
      const to = t.transfer_account_id ? accountsById.get(t.transfer_account_id) : undefined;
      return [
        t.occurred_on,
        TRANSACTION_KIND_LABEL[t.kind],
        acc?.name ?? "",
        acc?.currency ?? "",
        t.amount,
        t.category_id ? categoriesById.get(t.category_id)?.name ?? "" : "",
        to?.name ?? "",
        t.transfer_amount ?? "",
        t.note ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const blob = new Blob([`﻿${[header.join(","), ...lines].join("\n")}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `caudal-movimientos-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <PageHeader
        title="Movimientos"
        actions={
          <>
            <Button onClick={exportCsv} disabled={!filtered.length}>
              <Download className="size-4" /> Exportar CSV
            </Button>
            <Button variant="primary" onClick={() => openTx()} className="hidden md:inline-flex">
              <Plus className="size-4" /> Registrar
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface px-1">
          <button className="rounded-lg p-2 text-muted hover:text-ink" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-32 text-center font-medium capitalize">{monthLabel(month, true)}</span>
          <button
            className="rounded-lg p-2 text-muted hover:text-ink disabled:opacity-30"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={month >= current}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input placeholder="Buscar por nota, categoría o cuenta" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Buscar" />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select value={kind} onChange={(e) => { setKind(e.target.value as TransactionKind | ""); setCategoryId(""); }} aria-label="Tipo">
          <option value="">Todos los tipos</option>
          <option value="expense">Gastos</option>
          <option value="income">Ingresos</option>
          <option value="transfer">Transferencias</option>
        </Select>
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Cuenta">
          <option value="">Todas las cuentas</option>
          {data!.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Categoría" disabled={kind === "transfer"}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length ? (
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          <span>
            {totals.count} movimientos
          </span>
          <span>
            Ingresos <Money value={totals.income} currency={base} className="text-income" />
          </span>
          <span>
            Gastos <Money value={totals.expense} currency={base} className="text-ink" />
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="text-expense">{error}</p>
      ) : loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-surface-alt" />
      ) : groups.length === 0 ? (
        <Empty
          title={search || kind || accountId || categoryId ? "Nada coincide con esos filtros" : `Sin movimientos en ${monthLabel(month, true)}`}
          body={search || kind || accountId || categoryId ? "Prueba con otro mes o quita algún filtro." : "Registra ingresos, gastos o transferencias entre tus cuentas."}
          action={<Button variant="primary" onClick={() => openTx()}>Registrar movimiento</Button>}
        />
      ) : (
        <Card className="p-2 sm:p-3">
          {groups.map(([date, items]) => (
            <div key={date} className="mb-2 last:mb-0">
              <h3 className="px-3 pb-1 pt-3 text-sm font-medium text-muted">{dayLabel(date)}</h3>
              <ul>
                {items.map((t) => (
                  <TxRow key={t.id} tx={t} showDate={false} />
                ))}
              </ul>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

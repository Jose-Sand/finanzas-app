"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  api,
  budgetProgress,
  byCategory,
  dayLabel,
  friendlyError,
  goalProgress,
  monthKey,
  monthLabel,
  monthRange,
  monthlySeries,
  shiftMonth,
  summarize,
  todayISO,
  toISODate,
  upcoming,
} from "@caudal/shared";
import { BalanceBand } from "@/components/balance-band";
import { CashflowChart } from "@/components/charts";
import { useFinance } from "@/components/finance-provider";
import { useTxSheet } from "@/components/app-shell";
import { TxRow } from "@/components/tx-row";
import { useTransactions } from "@/components/use-transactions";
import { Button, Card, Dot, Empty, Money, Progress } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function PanelPage() {
  const { data, accountsById, categoriesById, refresh, toast } = useFinance();
  const { openTx } = useTxSheet();
  const today = todayISO();
  const currentMonth = monthKey(today);
  const [month, setMonth] = useState(currentMonth);
  const base = data!.profile.base_currency;

  // Six months of history feeds both the chart and this month's numbers.
  const { rows } = useTransactions({ from: monthRange(shiftMonth(month, -5)).start, to: monthRange(month).end });
  const txs = useMemo(() => rows ?? [], [rows]);

  const monthTxs = useMemo(() => txs.filter((t) => monthKey(t.occurred_on) === month), [txs, month]);
  const summary = summarize(monthTxs, accountsById, base, data!.rates);
  const prev = summarize(
    txs.filter((t) => monthKey(t.occurred_on) === shiftMonth(month, -1)),
    accountsById,
    base,
    data!.rates,
  );
  const series = monthlySeries(txs, month, 6, accountsById, base, data!.rates);
  const slices = byCategory(monthTxs, "expense", categoriesById, accountsById, base, data!.rates).slice(0, 6);
  const dayOfMonth = month === currentMonth ? Number(today.slice(8, 10)) : month < currentMonth ? 31 : 0;
  const budgets = budgetProgress(data!.budgets, monthTxs, categoriesById, accountsById, data!.rates, month, dayOfMonth).slice(0, 4);
  const in14 = new Date();
  in14.setDate(in14.getDate() + 14);
  const due = upcoming(data!.recurring, toISODate(in14)).slice(0, 5);
  const goals = data!.goals.filter((g) => !g.archived).map((g) => goalProgress(g, today)).slice(0, 3);

  const expenseDelta = prev.expense > 0 ? (summary.expense - prev.expense) / prev.expense : null;
  const isEmpty = rows !== null && txs.length === 0;

  async function post(id: string) {
    try {
      await api.postRecurring(supabaseBrowser(), id);
      await refresh();
      toast("Pago registrado");
    } catch (e) {
      toast(friendlyError(e), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted">Hola{data!.profile.full_name ? `, ${data!.profile.full_name.split(" ")[0]}` : ""}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Así va tu dinero</h1>
        </div>
      </div>

      <BalanceBand />

      {isEmpty ? (
        <Empty
          title="Registra tu primer movimiento"
          body="Empieza con tu último ingreso o un gasto de hoy. Con unos pocos registros verás a dónde se va tu dinero cada mes."
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => openTx({ kind: "income" })}>
                Registrar ingreso
              </Button>
              <Button onClick={() => openTx({ kind: "expense" })}>Registrar gasto</Button>
              <Link href="/cuentas" className="inline-flex h-10 items-center px-4 text-[15px] font-medium text-muted hover:text-ink">
                Agregar cuentas
              </Link>
            </div>
          }
        />
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button className="rounded-full p-1.5 text-muted hover:bg-surface-alt hover:text-ink" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">
              <ChevronLeft className="size-5" />
            </button>
            <h2 className="min-w-36 text-center font-display text-lg font-semibold capitalize">{monthLabel(month, true)}</h2>
            <button
              className="rounded-full p-1.5 text-muted hover:bg-surface-alt hover:text-ink disabled:opacity-30"
              onClick={() => setMonth(shiftMonth(month, 1))}
              disabled={month >= currentMonth}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          {summary.savingsRate !== null ? (
            <p className="text-sm text-muted">
              Ahorraste <span className="num font-semibold text-ink">{Math.round(summary.savingsRate * 100)}%</span> de lo que entró
            </p>
          ) : null}
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted">Entró</dt>
            <dd className="mt-1 font-display text-2xl font-semibold">
              <Money value={summary.income} currency={base} tone="income" />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Salió</dt>
            <dd className="mt-1 font-display text-2xl font-semibold">
              <Money value={summary.expense} currency={base} />
            </dd>
            {expenseDelta !== null ? (
              <p className={`text-sm ${expenseDelta > 0 ? "text-expense" : "text-income"}`}>
                {expenseDelta > 0 ? "+" : ""}
                {Math.round(expenseDelta * 100)}% frente a {monthLabel(shiftMonth(month, -1), true).split(" ")[0]}
              </p>
            ) : null}
          </div>
          <div>
            <dt className="text-sm text-muted">Te quedó</dt>
            <dd className="mt-1 font-display text-2xl font-semibold">
              <Money value={summary.net} currency={base} tone="auto" signed />
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <CashflowChart data={series} currency={base} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">En qué se fue</h2>
            <Link href="/movimientos" className="text-sm text-muted hover:text-ink">
              Ver movimientos
            </Link>
          </div>
          {slices.length === 0 ? (
            <p className="mt-4 text-muted">Sin gastos registrados en {monthLabel(month, true)}.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {slices.map((s) => (
                <li key={s.categoryId ?? "none"}>
                  <div className="flex items-center justify-between gap-3 text-[15px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <Dot color={s.color} />
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="num shrink-0">
                      <Money value={s.total} currency={base} />
                      <span className="ml-2 inline-block w-10 text-right text-sm text-faint">{Math.round(s.share * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-surface-alt">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, s.share * 100)}%`, background: s.color }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">Presupuestos</h2>
            <Link href="/presupuestos" className="text-sm text-muted hover:text-ink">
              {data!.budgets.length ? "Ver todos" : "Crear presupuesto"}
            </Link>
          </div>
          {budgets.length === 0 ? (
            <p className="mt-4 text-muted">Ponle un tope mensual a las categorías donde más gastas y aquí verás si vas a tiempo.</p>
          ) : (
            <ul className="mt-4 space-y-5">
              {budgets.map((b) => (
                <li key={b.budget.id}>
                  <div className="flex items-center justify-between text-[15px]">
                    <span className="flex items-center gap-2">
                      <Dot color={b.category?.color ?? "#8A94A6"} />
                      {b.category?.name}
                    </span>
                    <span className="num text-sm text-muted">
                      <Money value={b.spent} currency={b.budget.currency} className="text-ink" /> de{" "}
                      <Money value={b.budget.amount} currency={b.budget.currency} />
                    </span>
                  </div>
                  <div className="mt-2">
                    <Progress ratio={b.ratio} marker={month === currentMonth ? b.pace : undefined} tone={b.status === "over" ? "expense" : b.status === "warning" ? "warning" : "income"} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">Últimos movimientos</h2>
            <Link href="/movimientos" className="text-sm text-muted hover:text-ink">
              Ver todos
            </Link>
          </div>
          {txs.length === 0 ? (
            <p className="mt-4 text-muted">Aún no hay movimientos.</p>
          ) : (
            <ul className="-mx-3 mt-2">
              {txs.slice(0, 6).map((t) => (
                <TxRow key={t.id} tx={t} />
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">Próximos pagos</h2>
              <Link href="/recurrentes" className="text-sm text-muted hover:text-ink">
                Gestionar
              </Link>
            </div>
            {due.length === 0 ? (
              <p className="mt-4 text-muted">Nada pendiente en las próximas dos semanas.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {due.map((r) => {
                  const acc = accountsById.get(r.account_id);
                  const late = r.next_date < today;
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.name}</p>
                        <p className={`text-sm ${late ? "text-expense" : "text-muted"}`}>
                          {late ? "Vencido · " : ""}
                          {dayLabel(r.next_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {acc ? <Money value={r.amount} currency={acc.currency} tone={r.kind === "income" ? "income" : "plain"} /> : null}
                        <Button size="sm" onClick={() => post(r.id)}>
                          Registrar
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {goals.length ? (
            <Card>
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg font-semibold">Metas</h2>
                <Link href="/metas" className="text-sm text-muted hover:text-ink">
                  Ver metas
                </Link>
              </div>
              <ul className="mt-4 space-y-4">
                {goals.map((g) => (
                  <li key={g.goal.id}>
                    <div className="flex justify-between text-[15px]">
                      <span>{g.goal.name}</span>
                      <span className="num text-sm text-muted">{Math.round(g.ratio * 100)}%</span>
                    </div>
                    <div className="mt-2">
                      <Progress ratio={g.ratio} tone="mango" />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

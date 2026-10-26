"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  api,
  budgetProgress,
  CURRENCIES,
  friendlyError,
  monthKey,
  monthLabel,
  monthRange,
  parseAmount,
  todayISO,
  validatePositive,
  type Budget,
  type Currency,
} from "@caudal/shared";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useFinance } from "@/components/finance-provider";
import { useTransactions } from "@/components/use-transactions";
import { Button, Card, Dot, Empty, Field, Input, Money, PageHeader, Progress, Select, Sheet } from "@/components/ui";

export default function PresupuestosPage() {
  const { data, accountsById, categoriesById } = useFinance();
  const [editing, setEditing] = useState<Budget | null | undefined>(undefined);
  const today = todayISO();
  const month = monthKey(today);
  const range = monthRange(month);
  const { rows } = useTransactions({ from: range.start, to: range.end, kind: "expense" });
  const progress = budgetProgress(data!.budgets, rows ?? [], categoriesById, accountsById, data!.rates, month, Number(today.slice(8, 10)));

  const byCurrency = new Map<Currency, { total: number; spent: number }>();
  for (const p of progress) {
    const cur = byCurrency.get(p.budget.currency) ?? { total: 0, spent: 0 };
    cur.total += p.budget.amount;
    cur.spent += p.spent;
    byCurrency.set(p.budget.currency, cur);
  }

  return (
    <div>
      <PageHeader
        title="Presupuestos"
        description={`Topes mensuales por categoría. Mostrando ${monthLabel(month, true)}.`}
        actions={
          <Button variant="primary" onClick={() => setEditing(null)}>
            <Plus className="size-4" /> Nuevo presupuesto
          </Button>
        }
      />

      {progress.length === 0 ? (
        <Empty
          title="Aún no tienes presupuestos"
          body="Elige una categoría donde gastas seguido, como mercado o restaurantes, y ponle un tope mensual. Te avisamos cuando vayas más rápido de lo previsto."
          action={<Button variant="primary" onClick={() => setEditing(null)}>Crear presupuesto</Button>}
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-6">
            {[...byCurrency.entries()].map(([cur, v]) => (
              <div key={cur}>
                <p className="text-sm text-muted">Gastado de lo presupuestado ({cur})</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  <Money value={v.spent} currency={cur} /> <span className="text-muted">de</span> <Money value={v.total} currency={cur} />
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {progress.map((p) => (
              <button key={p.budget.id} className="text-left" onClick={() => setEditing(p.budget)}>
                <Card className="transition-colors hover:border-faint">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium">
                      <Dot color={p.category?.color ?? "#8A94A6"} /> {p.category?.name ?? "Categoría eliminada"}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        p.status === "over" ? "bg-expense/12 text-expense" : p.status === "warning" ? "bg-warning/12 text-warning" : "bg-income/12 text-income"
                      }`}
                    >
                      {p.status === "over" ? "Excedido" : p.status === "warning" ? "Vas rápido" : "A tiempo"}
                    </span>
                  </div>
                  <p className="mt-4">
                    <Money value={p.spent} currency={p.budget.currency} className="font-display text-xl font-semibold" />
                    <span className="text-muted"> de </span>
                    <Money value={p.budget.amount} currency={p.budget.currency} className="text-muted" />
                  </p>
                  <div className="mt-3">
                    <Progress ratio={p.ratio} marker={p.pace} tone={p.status === "over" ? "expense" : p.status === "warning" ? "warning" : "income"} />
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {p.remaining >= 0 ? (
                      <>
                        Te quedan <Money value={p.remaining} currency={p.budget.currency} className="text-ink" />
                      </>
                    ) : (
                      <>
                        Te pasaste por <Money value={-p.remaining} currency={p.budget.currency} className="text-expense" />
                      </>
                    )}
                  </p>
                </Card>
              </button>
            ))}
          </div>
        </>
      )}

      <BudgetSheet budget={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}

function BudgetSheet({ budget, onClose }: { budget: Budget | null | undefined; onClose: () => void }) {
  const { data, refresh, toast } = useFinance();
  const open = budget !== undefined;
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("COP");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  const used = new Set(data!.budgets.map((b) => b.category_id));
  const options = data!.categories.filter((c) => c.kind === "expense" && !c.archived && (!used.has(c.id) || c.id === budget?.category_id));

  const key = open ? budget?.id ?? "new" : null;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setCategoryId(budget?.category_id ?? options[0]?.id ?? "");
      setAmount(budget ? String(budget.amount) : "");
      setCurrency(budget?.currency ?? data!.profile.base_currency);
      setErr(null);
    }
  }

  async function save() {
    const v = parseAmount(amount);
    const e = !categoryId ? "Elige una categoría." : validatePositive(v);
    if (e) return setErr(e);
    setBusy(true);
    try {
      if (budget && budget.category_id !== categoryId) await api.deleteBudget(supabaseBrowser(), budget.id);
      await api.saveBudget(supabaseBrowser(), { category_id: categoryId, amount: v!, currency });
      await refresh();
      toast("Presupuesto guardado");
      onClose();
    } catch (e) {
      toast(friendlyError(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!budget) return;
    setBusy(true);
    try {
      await api.deleteBudget(supabaseBrowser(), budget.id);
      await refresh();
      toast("Presupuesto eliminado");
      onClose();
    } catch (e) {
      toast(friendlyError(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={budget ? "Editar presupuesto" : "Nuevo presupuesto"}
      footer={
        <div className="flex justify-between">
          {budget ? (
            <Button variant="danger" onClick={remove} disabled={busy}>
              Eliminar
            </Button>
          ) : (
            <span />
          )}
          <Button variant="primary" onClick={save} loading={busy}>
            Guardar
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        {options.length === 0 ? (
          <p className="text-muted">Todas tus categorías de gasto ya tienen presupuesto. Crea una categoría nueva en Ajustes.</p>
        ) : (
          <>
            <Field label="Categoría" htmlFor="b-cat">
              <Select id="b-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <Field label="Tope mensual" htmlFor="b-amt" error={err ?? undefined}>
                <Input id="b-amt" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="num" />
              </Field>
              <Field label="Moneda" htmlFor="b-cur">
                <Select id="b-cur" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <p className="text-sm text-muted">Los gastos en otras monedas se convierten a la moneda del presupuesto con la tasa del día.</p>
          </>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}

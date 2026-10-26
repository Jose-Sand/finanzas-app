"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  api,
  dayLabel,
  friendlyError,
  monthlyEquivalent,
  parseAmount,
  RECURRENCE_LABEL,
  sumIn,
  todayISO,
  validateName,
  validatePositive,
  type CategoryKind,
  type Recurrence,
  type Recurring,
} from "@caudal/shared";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useFinance } from "@/components/finance-provider";
import { Button, Card, cx, Empty, Field, Input, Money, PageHeader, Segmented, Select, Sheet } from "@/components/ui";

export default function RecurrentesPage() {
  const { data, accountsById, categoriesById, refresh, toast } = useFinance();
  const [editing, setEditing] = useState<Recurring | null | undefined>(undefined);
  const [posting, setPosting] = useState<string | null>(null);
  const today = todayISO();
  const base = data!.profile.base_currency;
  const items = data!.recurring;

  const monthly = (kind: CategoryKind) =>
    sumIn(
      items
        .filter((r) => r.active && r.kind === kind)
        .map((r) => ({ amount: monthlyEquivalent(r), currency: accountsById.get(r.account_id)?.currency ?? base })),
      base,
      data!.rates,
    ).total;

  async function post(id: string) {
    setPosting(id);
    try {
      await api.postRecurring(supabaseBrowser(), id);
      await refresh();
      toast("Pago registrado como movimiento");
    } catch (e) {
      toast(friendlyError(e), "error");
    } finally {
      setPosting(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Recurrentes"
        description="Arriendo, servicios, suscripciones y salario. Regístralos con un toque cuando lleguen."
        actions={
          <Button variant="primary" onClick={() => setEditing(null)}>
            <Plus className="size-4" /> Nuevo
          </Button>
        }
      />

      {items.length === 0 ? (
        <Empty
          title="Agrega tus pagos fijos"
          body="Cuando sabes qué sale cada mes, sabes cuánto queda libre. Empieza por el arriendo o tus suscripciones."
          action={<Button variant="primary" onClick={() => setEditing(null)}>Agregar pago recurrente</Button>}
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <Card>
              <p className="text-sm text-muted">Gastos fijos al mes</p>
              <Money value={monthly("expense")} currency={base} className="mt-1 block font-display text-2xl font-semibold" />
            </Card>
            <Card>
              <p className="text-sm text-muted">Ingresos fijos al mes</p>
              <Money value={monthly("income")} currency={base} tone="income" className="mt-1 block font-display text-2xl font-semibold" />
            </Card>
          </div>
          <Card className="p-0">
            <ul className="divide-y divide-line">
              {items.map((r) => {
                const acc = accountsById.get(r.account_id);
                const cat = r.category_id ? categoriesById.get(r.category_id) : undefined;
                const late = r.active && r.next_date < today;
                return (
                  <li key={r.id} className={cx("flex flex-wrap items-center gap-3 px-5 py-4", !r.active && "opacity-60")}>
                    <button onClick={() => setEditing(r)} className="min-w-0 flex-1 text-left">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="text-sm text-muted">
                        {RECURRENCE_LABEL[r.cadence]} · {cat?.name ?? "Sin categoría"} · {acc?.name}
                      </p>
                    </button>
                    <div className="text-right">
                      {acc ? <Money value={r.amount} currency={acc.currency} tone={r.kind === "income" ? "income" : "plain"} className="font-medium" /> : null}
                      <p className={cx("text-sm", late ? "text-expense" : "text-muted")}>
                        {!r.active ? "Pausado" : `${late ? "Vencido · " : "Próximo: "}${dayLabel(r.next_date)}`}
                      </p>
                    </div>
                    {r.active ? (
                      <Button size="sm" onClick={() => post(r.id)} loading={posting === r.id}>
                        Registrar
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      <RecurringSheet item={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}

function RecurringSheet({ item, onClose }: { item: Recurring | null | undefined; onClose: () => void }) {
  const { data, refresh, toast } = useFinance();
  const open = item !== undefined;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<Recurrence>("monthly");
  const [next, setNext] = useState(todayISO());
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  const accounts = data!.accounts.filter((a) => !a.archived || a.id === item?.account_id);
  const key = open ? item?.id ?? "new" : null;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setName(item?.name ?? "");
      setKind(item?.kind ?? "expense");
      setAccountId(item?.account_id ?? accounts[0]?.id ?? "");
      setCategoryId(item?.category_id ?? "");
      setAmount(item ? String(item.amount) : "");
      setCadence(item?.cadence ?? "monthly");
      setNext(item?.next_date ?? todayISO());
      setActive(item?.active ?? true);
      setErrors({});
    }
  }

  async function save() {
    const v = parseAmount(amount);
    const e: Record<string, string> = {};
    const n = validateName(name);
    if (n) e.name = n;
    const a = validatePositive(v);
    if (a) e.amount = a;
    if (!accountId) e.account = "Elige una cuenta.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.saveRecurring(
        supabaseBrowser(),
        { name: name.trim(), kind, account_id: accountId, category_id: categoryId || null, amount: v!, cadence, next_date: next, active },
        item?.id,
      );
      await refresh();
      toast(item ? "Pago recurrente actualizado" : "Pago recurrente creado");
      onClose();
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!item || !confirm(`¿Eliminar "${item.name}"? Los movimientos ya registrados se conservan.`)) return;
    setBusy(true);
    try {
      await api.deleteRecurring(supabaseBrowser(), item.id);
      await refresh();
      toast("Pago recurrente eliminado");
      onClose();
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? "Editar pago recurrente" : "Nuevo pago recurrente"}
      footer={
        <div className="flex justify-between">
          {item ? (
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
        <Segmented
          label="Tipo"
          value={kind}
          onChange={(k) => {
            setKind(k);
            setCategoryId("");
          }}
          options={[
            { value: "expense", label: "Gasto" },
            { value: "income", label: "Ingreso" },
          ]}
        />
        <Field label="Nombre" htmlFor="r-name" error={errors.name}>
          <Input id="r-name" placeholder="Arriendo, Netflix, Salario…" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Monto" htmlFor="r-amt" error={errors.amount}>
          <Input id="r-amt" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="num" />
        </Field>
        <Field label="Cuenta" htmlFor="r-acc" error={errors.account}>
          <Select id="r-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.currency}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Categoría" htmlFor="r-cat">
          <Select id="r-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sin categoría</option>
            {data!.categories
              .filter((c) => c.kind === kind && !c.archived)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Frecuencia" htmlFor="r-cad">
            <Select id="r-cad" value={cadence} onChange={(e) => setCadence(e.target.value as Recurrence)}>
              {(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map((c) => (
                <option key={c} value={c}>
                  {RECURRENCE_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Próxima fecha" htmlFor="r-next">
            <Input id="r-next" type="date" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
        </div>
        {item ? (
          <label className="flex items-center gap-3 text-[15px]">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-[var(--ink)]" />
            Activo
          </label>
        ) : null}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}

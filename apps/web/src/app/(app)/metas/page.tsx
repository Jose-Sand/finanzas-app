"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  api,
  CURRENCIES,
  dayLabel,
  friendlyError,
  goalProgress,
  parseAmount,
  SWATCHES,
  todayISO,
  validateName,
  validatePositive,
  type Currency,
  type Goal,
} from "@caudal/shared";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useFinance } from "@/components/finance-provider";
import { Button, Card, cx, Empty, Field, Input, Money, PageHeader, Select, Sheet } from "@/components/ui";

export default function MetasPage() {
  const { data, refresh, toast } = useFinance();
  const [editing, setEditing] = useState<Goal | null | undefined>(undefined);
  const [adding, setAdding] = useState<Goal | null>(null);
  const today = todayISO();
  const goals = data!.goals.filter((g) => !g.archived).map((g) => goalProgress(g, today));

  return (
    <div>
      <PageHeader
        title="Metas"
        description="Ahorra para algo concreto y mira cuánto necesitas apartar cada mes."
        actions={
          <Button variant="primary" onClick={() => setEditing(null)}>
            <Plus className="size-4" /> Nueva meta
          </Button>
        }
      />

      {goals.length === 0 ? (
        <Empty
          title="Ponle nombre a lo que quieres lograr"
          body="Un fondo de emergencia, un viaje, la cuota inicial de un apartamento. Define el monto y la fecha, y te decimos cuánto ahorrar al mes."
          action={<Button variant="primary" onClick={() => setEditing(null)}>Crear meta</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map(({ goal, ratio, remaining, monthlyNeeded, daysLeft }) => (
            <Card key={goal.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{goal.name}</h2>
                  {goal.target_date ? (
                    <p className={cx("text-sm", daysLeft !== null && daysLeft < 0 ? "text-expense" : "text-muted")}>
                      {daysLeft !== null && daysLeft < 0 ? "Venció el " : "Para el "}
                      {dayLabel(goal.target_date)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted">Sin fecha límite</p>
                  )}
                </div>
                <button onClick={() => setEditing(goal)} className="text-sm text-muted hover:text-ink">
                  Editar
                </button>
              </div>

              <p className="mt-5">
                <Money value={goal.saved_amount} currency={goal.currency} className="font-display text-2xl font-semibold" />
                <span className="text-muted"> de </span>
                <Money value={goal.target_amount} currency={goal.currency} className="text-muted" />
              </p>
              <div className="mt-3">
                <div className="h-2.5 w-full rounded-full bg-surface-alt">
                  <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: goal.color }} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  {remaining <= 0 ? (
                    <span className="font-medium text-income">Meta cumplida</span>
                  ) : monthlyNeeded !== null && (daysLeft ?? 0) > 0 ? (
                    <>
                      Aparta <Money value={monthlyNeeded} currency={goal.currency} className="font-medium text-ink" /> al mes
                    </>
                  ) : (
                    <>
                      Faltan <Money value={remaining} currency={goal.currency} className="text-ink" />
                    </>
                  )}
                </p>
                {remaining > 0 ? (
                  <Button size="sm" onClick={() => setAdding(goal)}>
                    Abonar
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <GoalSheet goal={editing} onClose={() => setEditing(undefined)} />
      <ContributeSheet
        goal={adding}
        onClose={() => setAdding(null)}
        onSave={async (amt) => {
          if (!adding) return;
          try {
            await api.saveGoal(supabaseBrowser(), { saved_amount: Math.max(0, adding.saved_amount + amt) }, adding.id);
            await refresh();
            toast(amt >= 0 ? "Abono registrado" : "Retiro registrado");
            setAdding(null);
          } catch (e) {
            toast(friendlyError(e), "error");
          }
        }}
      />
    </div>
  );
}

function ContributeSheet({ goal, onClose, onSave }: { goal: Goal | null; onClose: () => void; onSave: (amount: number) => Promise<void> }) {
  const [amount, setAmount] = useState("");
  const [withdraw, setWithdraw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  if ((goal?.id ?? null) !== lastId) {
    setLastId(goal?.id ?? null);
    setAmount("");
    setWithdraw(false);
    setErr(null);
  }

  async function submit() {
    const v = parseAmount(amount);
    const e = validatePositive(v);
    if (e) return setErr(e);
    setBusy(true);
    await onSave(withdraw ? -v! : v!);
    setBusy(false);
  }

  return (
    <Sheet
      open={Boolean(goal)}
      onClose={onClose}
      title={goal ? `${withdraw ? "Retirar de" : "Abonar a"} ${goal.name}` : ""}
      footer={
        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setWithdraw(!withdraw)}>
            {withdraw ? "Abonar en vez de retirar" : "Retirar dinero"}
          </Button>
          <Button variant="primary" onClick={submit} loading={busy}>
            {withdraw ? "Retirar" : "Abonar"}
          </Button>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label={`Monto en ${goal?.currency ?? ""}`} htmlFor="g-add" error={err ?? undefined}>
          <Input id="g-add" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-14 font-display text-2xl num" />
        </Field>
      </form>
    </Sheet>
  );
}

function GoalSheet({ goal, onClose }: { goal: Goal | null | undefined; onClose: () => void }) {
  const { data, refresh, toast } = useFinance();
  const open = goal !== undefined;
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [currency, setCurrency] = useState<Currency>("COP");
  const [date, setDate] = useState("");
  const [color, setColor] = useState<string>(SWATCHES[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  const key = open ? goal?.id ?? "new" : null;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setName(goal?.name ?? "");
      setTarget(goal ? String(goal.target_amount) : "");
      setSaved(goal ? String(goal.saved_amount) : "");
      setCurrency(goal?.currency ?? data!.profile.base_currency);
      setDate(goal?.target_date ?? "");
      setColor(goal?.color ?? SWATCHES[0]);
      setErrors({});
    }
  }

  async function save() {
    const t = parseAmount(target);
    const s = saved.trim() ? parseAmount(saved) : 0;
    const e: Record<string, string> = {};
    const n = validateName(name);
    if (n) e.name = n;
    const tp = validatePositive(t, "La meta");
    if (tp) e.target = tp;
    if (s === null || s < 0) e.saved = "Escribe un monto válido.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.saveGoal(
        supabaseBrowser(),
        { name: name.trim(), target_amount: t!, saved_amount: s!, currency, target_date: date || null, color },
        goal?.id,
      );
      await refresh();
      toast(goal ? "Meta actualizada" : "Meta creada");
      onClose();
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!goal || !confirm(`¿Eliminar la meta "${goal.name}"?`)) return;
    setBusy(true);
    try {
      await api.deleteGoal(supabaseBrowser(), goal.id);
      await refresh();
      toast("Meta eliminada");
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
      title={goal ? "Editar meta" : "Nueva meta"}
      footer={
        <div className="flex justify-between">
          {goal ? (
            <Button variant="danger" onClick={remove} disabled={busy}>
              Eliminar
            </Button>
          ) : (
            <span />
          )}
          <Button variant="primary" onClick={save} loading={busy}>
            {goal ? "Guardar cambios" : "Crear meta"}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="Nombre" htmlFor="g-name" error={errors.name}>
          <Input id="g-name" placeholder="Fondo de emergencia" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field label="Monto objetivo" htmlFor="g-target" error={errors.target}>
            <Input id="g-target" inputMode="decimal" placeholder="0" value={target} onChange={(e) => setTarget(e.target.value)} className="num" />
          </Field>
          <Field label="Moneda" htmlFor="g-cur">
            <Select id="g-cur" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Ya ahorrado" htmlFor="g-saved" error={errors.saved}>
          <Input id="g-saved" inputMode="decimal" placeholder="0" value={saved} onChange={(e) => setSaved(e.target.value)} className="num" />
        </Field>
        <Field label="Fecha límite" htmlFor="g-date" hint="Opcional. Con fecha calculamos cuánto apartar al mes.">
          <Input id="g-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-muted">Color</legend>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setColor(s)}
                aria-label={`Color ${s}`}
                aria-pressed={color === s}
                className={cx("size-8 rounded-full ring-offset-2 ring-offset-surface", color === s && "ring-2 ring-ink")}
                style={{ background: s }}
              />
            ))}
          </div>
        </fieldset>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}

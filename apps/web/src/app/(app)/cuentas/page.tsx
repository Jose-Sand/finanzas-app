"use client";

import { useState } from "react";
import { Archive, Plus } from "lucide-react";
import {
  ACCOUNT_KIND_LABEL,
  api,
  convert,
  CURRENCIES,
  friendlyError,
  parseAmount,
  SWATCHES,
  validateName,
  type Account,
  type AccountKind,
  type Currency,
} from "@caudal/shared";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useFinance } from "@/components/finance-provider";
import { Button, Card, cx, Field, Input, Money, PageHeader, Select, Sheet } from "@/components/ui";

const KIND_ORDER: AccountKind[] = ["checking", "savings", "wallet", "cash", "investment", "credit_card"];

export default function CuentasPage() {
  const { data } = useFinance();
  const [editing, setEditing] = useState<Account | null | undefined>(undefined);
  const base = data!.profile.base_currency;
  const balances = new Map(data!.balances.map((b) => [b.account_id, b.balance]));
  const active = data!.accounts.filter((a) => !a.archived);
  const archived = data!.accounts.filter((a) => a.archived);

  const groups = KIND_ORDER.map((k) => ({ kind: k, items: active.filter((a) => a.kind === k) })).filter((g) => g.items.length);

  return (
    <div>
      <PageHeader
        title="Cuentas"
        description="Cada cuenta lleva su propia moneda. El total se convierte con la tasa del día."
        actions={
          <Button variant="primary" onClick={() => setEditing(null)}>
            <Plus className="size-4" /> Nueva cuenta
          </Button>
        }
      />

      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.kind}>
            <h2 className="mb-3 text-sm font-medium text-muted">{ACCOUNT_KIND_LABEL[g.kind]}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((a) => {
                const bal = balances.get(a.id) ?? a.opening_balance;
                const inBase = a.currency !== base ? convert(bal, a.currency, base, data!.rates) : null;
                return (
                  <button key={a.id} onClick={() => setEditing(a)} className="text-left">
                    <Card className="h-full transition-colors hover:border-faint">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="h-5 w-1.5 rounded-full" style={{ background: a.color }} aria-hidden />
                          {a.name}
                        </span>
                        <span className="rounded-md bg-surface-alt px-2 py-0.5 text-xs font-medium text-muted">{a.currency}</span>
                      </div>
                      <p className="mt-4 font-display text-2xl font-semibold">
                        <Money value={bal} currency={a.currency} className={bal < 0 ? "text-expense" : ""} />
                      </p>
                      {inBase !== null ? (
                        <p className="mt-0.5 text-sm text-muted">
                          ≈ <Money value={inBase} currency={base} />
                        </p>
                      ) : null}
                    </Card>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {archived.length ? (
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted">Archivadas</h2>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {archived.map((a) => (
                <li key={a.id}>
                  <button onClick={() => setEditing(a)} className="flex w-full items-center justify-between px-5 py-3 text-left text-muted hover:text-ink">
                    <span className="flex items-center gap-2">
                      <Archive className="size-4" /> {a.name}
                    </span>
                    <Money value={balances.get(a.id) ?? 0} currency={a.currency} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <AccountSheet account={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}

function AccountSheet({ account, onClose }: { account: Account | null | undefined; onClose: () => void }) {
  const { data, refresh, toast } = useFinance();
  const open = account !== undefined;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("checking");
  const [currency, setCurrency] = useState<Currency>("COP");
  const [opening, setOpening] = useState("");
  const [color, setColor] = useState<string>(SWATCHES[3]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  const key = open ? account?.id ?? "new" : null;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setName(account?.name ?? "");
      setKind(account?.kind ?? "checking");
      setCurrency(account?.currency ?? data!.profile.base_currency);
      setOpening(account ? String(account.opening_balance) : "");
      setColor(account?.color ?? SWATCHES[3]);
      setErr(null);
    }
  }

  async function save() {
    const nameErr = validateName(name);
    if (nameErr) return setErr(nameErr);
    const ob = opening.trim() ? parseAmount(opening) : 0;
    if (ob === null) return setErr("El saldo inicial no es un número válido.");
    setBusy(true);
    try {
      await api.saveAccount(
        supabaseBrowser(),
        { name: name.trim(), kind, currency, opening_balance: kind === "credit_card" ? -Math.abs(ob) : ob, color },
        account?.id,
      );
      await refresh();
      toast(account ? "Cuenta actualizada" : "Cuenta creada");
      onClose();
    } catch (e) {
      toast(friendlyError(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    if (!account) return;
    setBusy(true);
    try {
      await api.saveAccount(supabaseBrowser(), { archived: !account.archived }, account.id);
      await refresh();
      toast(account.archived ? "Cuenta restaurada" : "Cuenta archivada");
      onClose();
    } catch (e) {
      toast(friendlyError(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!account) return;
    if (!confirm(`¿Eliminar "${account.name}" y todos sus movimientos? Si solo quieres ocultarla, archívala.`)) return;
    setBusy(true);
    try {
      await api.deleteAccount(supabaseBrowser(), account.id);
      await refresh();
      toast("Cuenta eliminada");
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
      title={account ? "Editar cuenta" : "Nueva cuenta"}
      footer={
        <div className="flex items-center justify-between gap-2">
          {account ? (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={toggleArchive} disabled={busy}>
                {account.archived ? "Restaurar" : "Archivar"}
              </Button>
              <Button variant="danger" onClick={remove} disabled={busy}>
                Eliminar
              </Button>
            </div>
          ) : (
            <span />
          )}
          <Button variant="primary" onClick={save} loading={busy}>
            {account ? "Guardar cambios" : "Crear cuenta"}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="Nombre" htmlFor="acc-name" error={err ?? undefined}>
          <Input id="acc-name" placeholder="Bancolombia, Nequi, Wise…" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Tipo" htmlFor="acc-kind">
          <Select id="acc-kind" value={kind} onChange={(e) => setKind(e.target.value as AccountKind)}>
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>
                {ACCOUNT_KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Moneda" htmlFor="acc-cur" hint={account ? "La moneda no se puede cambiar después de crear la cuenta." : undefined}>
          <Select id="acc-cur" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} disabled={Boolean(account)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={kind === "credit_card" ? "Deuda actual" : "Saldo inicial"}
          htmlFor="acc-open"
          hint={kind === "credit_card" ? "Lo que debes hoy en la tarjeta. Los gastos con la tarjeta aumentan la deuda." : "Lo que hay hoy en la cuenta, antes de registrar movimientos."}
        >
          <Input id="acc-open" inputMode="decimal" placeholder="0" value={opening.replace(/^-/, "")} onChange={(e) => setOpening(e.target.value)} className="num" />
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

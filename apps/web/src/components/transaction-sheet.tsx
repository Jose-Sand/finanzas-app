"use client";

import { useMemo, useState } from "react";
import {
  api,
  crossRate,
  formatMoney,
  friendlyError,
  parseAmount,
  todayISO,
  transactionRow,
  validateTransaction,
  type FieldErrors,
  type Transaction,
  type TransactionKind,
} from "@caudal/shared";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useFinance } from "./finance-provider";
import { Button, Field, Input, Segmented, Select, Sheet } from "./ui";

export interface TxSheetState {
  open: boolean;
  editing?: Transaction;
  kind?: TransactionKind;
}

export function TransactionSheet({ state, onClose }: { state: TxSheetState; onClose: () => void }) {
  if (!state.open) return null;
  // A fresh key per opening resets the form from props without effects.
  return <TxSheetInner key={state.editing?.id ?? `new-${state.kind ?? ""}`} state={state} onClose={onClose} />;
}

function TxSheetInner({ state, onClose }: { state: TxSheetState; onClose: () => void }) {
  const { data, accountsById, refresh, toast } = useFinance();
  const editing = state.editing;
  const accounts = useMemo(() => (data?.accounts ?? []).filter((a) => !a.archived || a.id === editing?.account_id), [data, editing]);

  const [kind, setKind] = useState<TransactionKind>(editing?.kind ?? state.kind ?? "expense");
  const [accountId, setAccountId] = useState(editing?.account_id ?? accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(editing?.transfer_account_id ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [toAmount, setToAmount] = useState(editing?.transfer_amount ? String(editing.transfer_amount) : "");
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? "");
  const [date, setDate] = useState(editing?.occurred_on ?? todayISO());
  const [note, setNote] = useState(editing?.note ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const from = accountsById.get(accountId);
  const to = accountsById.get(toAccountId);
  const crossCurrency = kind === "transfer" && from && to && from.currency !== to.currency;
  const suggested = crossCurrency && data ? crossRate(from.currency, to.currency, data.rates) : null;
  const parsedAmount = parseAmount(amount);

  const categories = (data?.categories ?? []).filter((c) => c.kind === kind && (!c.archived || c.id === categoryId));

  async function save() {
    const draft = {
      kind,
      account_id: accountId,
      amount: parsedAmount,
      category_id: kind === "transfer" ? null : categoryId || null,
      transfer_account_id: kind === "transfer" ? toAccountId || null : null,
      transfer_amount: crossCurrency ? parseAmount(toAmount) ?? (parsedAmount && suggested ? parsedAmount * suggested : null) : null,
      occurred_on: date,
      note,
    };
    const errs = validateTransaction(draft);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const row = transactionRow(draft, !crossCurrency);
      if (row.transfer_amount && to) row.transfer_amount = Math.round(row.transfer_amount * 100) / 100;
      await api.saveTransaction(supabaseBrowser(), row, editing?.id);
      await refresh();
      toast(editing ? "Movimiento actualizado" : "Movimiento guardado");
      onClose();
    } catch (e) {
      toast(friendlyError(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing) return;
    if (!confirm("¿Eliminar este movimiento? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    try {
      await api.deleteTransaction(supabaseBrowser(), editing.id);
      await refresh();
      toast("Movimiento eliminado");
      onClose();
    } catch (e) {
      toast(friendlyError(e), "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? "Editar movimiento" : "Nuevo movimiento"}
      footer={
        <div className="flex items-center justify-between gap-3">
          {editing ? (
            <Button variant="danger" onClick={remove} loading={deleting}>
              Eliminar
            </Button>
          ) : (
            <span />
          )}
          <Button variant="primary" onClick={save} loading={saving} className="min-w-32">
            {editing ? "Guardar cambios" : "Guardar"}
          </Button>
        </div>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Segmented
          label="Tipo de movimiento"
          value={kind}
          onChange={(k) => {
            setKind(k);
            setCategoryId("");
          }}
          options={[
            { value: "expense", label: "Gasto" },
            { value: "income", label: "Ingreso" },
            { value: "transfer", label: "Transferir" },
          ]}
        />

        <Field label={`Monto${from ? ` en ${from.currency}` : ""}`} htmlFor="tx-amount" error={errors.amount}>
          <Input
            id="tx-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={Boolean(errors.amount)}
            className="h-14 font-display text-2xl num"
          />
        </Field>

        <Field label={kind === "transfer" ? "Desde" : "Cuenta"} htmlFor="tx-account" error={errors.account_id}>
          <Select id="tx-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.currency}
              </option>
            ))}
          </Select>
        </Field>

        {kind === "transfer" ? (
          <>
            <Field label="Hacia" htmlFor="tx-to" error={errors.transfer_account_id}>
              <Select id="tx-to" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                <option value="">Elige la cuenta de destino</option>
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.currency}
                    </option>
                  ))}
              </Select>
            </Field>
            {crossCurrency && to ? (
              <Field
                label={`Recibido en ${to.currency}`}
                htmlFor="tx-to-amount"
                error={errors.transfer_amount}
                hint={
                  suggested && parsedAmount
                    ? `Con la tasa del día serían ${formatMoney(parsedAmount * suggested, to.currency)}. Escribe lo que realmente llegó.`
                    : "Escribe lo que realmente llegó a la cuenta de destino."
                }
              >
                <Input
                  id="tx-to-amount"
                  inputMode="decimal"
                  placeholder={suggested && parsedAmount ? String(Math.round(parsedAmount * suggested)) : "0"}
                  value={toAmount}
                  onChange={(e) => setToAmount(e.target.value)}
                  className="num"
                />
              </Field>
            ) : null}
          </>
        ) : (
          <Field label="Categoría" htmlFor="tx-category">
            <Select id="tx-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Fecha" htmlFor="tx-date" error={errors.occurred_on}>
          <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="Nota" htmlFor="tx-note" error={errors.note}>
          <Input id="tx-note" placeholder="Opcional" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}

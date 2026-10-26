import { CURRENCIES, type Currency, type TransactionKind } from './types';

export type FieldErrors = Record<string, string>;

export interface TransactionDraft {
  kind: TransactionKind;
  account_id: string;
  amount: number | null;
  category_id: string | null;
  transfer_account_id: string | null;
  transfer_amount: number | null;
  occurred_on: string;
  note: string;
}

export function isCurrency(v: unknown): v is Currency {
  return typeof v === 'string' && (CURRENCIES as readonly string[]).includes(v);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateTransaction(d: TransactionDraft): FieldErrors {
  const e: FieldErrors = {};
  if (!d.account_id) e.account_id = 'Elige una cuenta.';
  if (d.amount === null || !(d.amount > 0)) e.amount = 'Escribe un monto mayor que cero.';
  if (!ISO_DATE.test(d.occurred_on)) e.occurred_on = 'Usa una fecha válida.';
  if (d.note.length > 280) e.note = 'La nota admite hasta 280 caracteres.';
  if (d.kind === 'transfer') {
    if (!d.transfer_account_id) e.transfer_account_id = 'Elige la cuenta de destino.';
    else if (d.transfer_account_id === d.account_id) e.transfer_account_id = 'El destino debe ser otra cuenta.';
    if (d.transfer_amount !== null && !(d.transfer_amount > 0)) e.transfer_amount = 'El monto recibido debe ser mayor que cero.';
  }
  return e;
}

export function validateName(name: string, max = 60): string | null {
  const n = name.trim();
  if (!n) return 'Escribe un nombre.';
  if (n.length > max) return `Máximo ${max} caracteres.`;
  return null;
}

export function validatePositive(v: number | null, label = 'El monto'): string | null {
  if (v === null || !Number.isFinite(v) || v <= 0) return `${label} debe ser mayor que cero.`;
  return null;
}

/** Build the row to insert from a validated draft. */
export function transactionRow(d: TransactionDraft, sameCurrency: boolean) {
  const isTransfer = d.kind === 'transfer';
  return {
    kind: d.kind,
    account_id: d.account_id,
    amount: d.amount as number,
    category_id: isTransfer ? null : d.category_id || null,
    transfer_account_id: isTransfer ? d.transfer_account_id : null,
    transfer_amount: isTransfer ? (sameCurrency || d.transfer_amount === null ? d.amount : d.transfer_amount) : null,
    occurred_on: d.occurred_on,
    note: d.note.trim() || null,
  };
}

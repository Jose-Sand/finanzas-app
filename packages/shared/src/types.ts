export const CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'PEN', 'CLP', 'ARS', 'BRL', 'GBP', 'CAD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export type AccountKind = 'cash' | 'checking' | 'savings' | 'credit_card' | 'investment' | 'wallet';
export type CategoryKind = 'income' | 'expense';
export type TransactionKind = 'income' | 'expense' | 'transfer';
export type Recurrence = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Profile {
  id: string;
  full_name: string | null;
  base_currency: Currency;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  kind: AccountKind;
  currency: Currency;
  opening_balance: number;
  color: string;
  archived: boolean;
  created_at: string;
}

export interface AccountBalance {
  account_id: string;
  user_id: string;
  currency: Currency;
  balance: number;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  archived: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  kind: TransactionKind;
  account_id: string;
  amount: number;
  category_id: string | null;
  transfer_account_id: string | null;
  transfer_amount: number | null;
  occurred_on: string;
  note: string | null;
  recurring_id: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  currency: Currency;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  currency: Currency;
  target_date: string | null;
  color: string;
  archived: boolean;
  created_at: string;
}

export interface Recurring {
  id: string;
  user_id: string;
  name: string;
  kind: CategoryKind;
  account_id: string;
  category_id: string | null;
  amount: number;
  cadence: Recurrence;
  next_date: string;
  active: boolean;
  created_at: string;
}

export interface FxRate {
  quote: Currency;
  per_usd: number;
  fetched_at: string;
}

/** Map of currency -> units per 1 USD. */
export type RateTable = Partial<Record<Currency, number>>;

export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
  cash: 'Efectivo',
  checking: 'Cuenta corriente',
  savings: 'Ahorros',
  credit_card: 'Tarjeta de crédito',
  investment: 'Inversión',
  wallet: 'Billetera digital',
};

export const TRANSACTION_KIND_LABEL: Record<TransactionKind, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
};

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

export const CURRENCY_NAME: Record<Currency, string> = {
  COP: 'Peso colombiano',
  USD: 'Dólar estadounidense',
  EUR: 'Euro',
  MXN: 'Peso mexicano',
  PEN: 'Sol peruano',
  CLP: 'Peso chileno',
  ARS: 'Peso argentino',
  BRL: 'Real brasileño',
  GBP: 'Libra esterlina',
  CAD: 'Dólar canadiense',
};

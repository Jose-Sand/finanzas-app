import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Account,
  AccountBalance,
  Budget,
  Category,
  Currency,
  FxRate,
  Goal,
  Profile,
  RateTable,
  Recurring,
  Transaction,
} from './types';

/** Data access shared by web and mobile. All calls rely on RLS for scoping. */

// PostgREST may serialize numeric as string; normalize every money field.
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0));

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export interface CoreData {
  profile: Profile;
  accounts: Account[];
  balances: AccountBalance[];
  categories: Category[];
  budgets: Budget[];
  goals: Goal[];
  recurring: Recurring[];
  rates: RateTable;
  ratesFetchedAt: string | null;
}

export async function loadCore(sb: SupabaseClient): Promise<CoreData> {
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error('Sesión expirada. Vuelve a entrar.');

  const [profile, accounts, balances, categories, budgets, goals, recurring, rates] = await Promise.all([
    sb.from('profiles').select('*').eq('id', auth.user.id).single(),
    sb.from('accounts').select('*').order('created_at'),
    sb.from('account_balances').select('*'),
    sb.from('categories').select('*').order('name'),
    sb.from('budgets').select('*'),
    sb.from('goals').select('*').order('created_at'),
    sb.from('recurring').select('*').order('next_date'),
    sb.from('fx_rates').select('*'),
  ]);

  const rateRows = unwrap<FxRate[]>(rates);
  const table: RateTable = {};
  let fetched: string | null = null;
  for (const r of rateRows) {
    table[r.quote] = num(r.per_usd);
    if (!fetched || r.fetched_at > fetched) fetched = r.fetched_at;
  }

  return {
    profile: unwrap<Profile>(profile),
    accounts: unwrap<Account[]>(accounts).map((a) => ({ ...a, opening_balance: num(a.opening_balance) })),
    balances: unwrap<AccountBalance[]>(balances).map((b) => ({ ...b, balance: num(b.balance) })),
    categories: unwrap<Category[]>(categories),
    budgets: unwrap<Budget[]>(budgets).map((b) => ({ ...b, amount: num(b.amount) })),
    goals: unwrap<Goal[]>(goals).map((g) => ({
      ...g,
      target_amount: num(g.target_amount),
      saved_amount: num(g.saved_amount),
    })),
    recurring: unwrap<Recurring[]>(recurring).map((r) => ({ ...r, amount: num(r.amount) })),
    rates: table,
    ratesFetchedAt: fetched,
  };
}

export interface TxQuery {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  kind?: Transaction['kind'];
  search?: string;
  limit?: number;
}

export async function loadTransactions(sb: SupabaseClient, q: TxQuery = {}): Promise<Transaction[]> {
  let query = sb.from('transactions').select('*');
  if (q.from) query = query.gte('occurred_on', q.from);
  if (q.to) query = query.lte('occurred_on', q.to);
  if (q.accountId) query = query.or(`account_id.eq.${q.accountId},transfer_account_id.eq.${q.accountId}`);
  if (q.categoryId) query = query.eq('category_id', q.categoryId);
  if (q.kind) query = query.eq('kind', q.kind);
  if (q.search) query = query.ilike('note', `%${q.search.replace(/[%_,()]/g, '')}%`);
  query = query.order('occurred_on', { ascending: false }).order('created_at', { ascending: false });
  if (q.limit) query = query.limit(q.limit);
  return unwrap<Transaction[]>(await query).map((t) => ({
    ...t,
    amount: num(t.amount),
    transfer_amount: t.transfer_amount === null ? null : num(t.transfer_amount),
  }));
}

type Row<T> = Partial<Omit<T, 'id' | 'user_id' | 'created_at'>>;

async function insert<T>(sb: SupabaseClient, table: string, row: object): Promise<T> {
  return unwrap<T>(await sb.from(table).insert(row).select().single());
}
async function update<T>(sb: SupabaseClient, table: string, id: string, row: object): Promise<T> {
  return unwrap<T>(await sb.from(table).update(row).eq('id', id).select().single());
}
async function remove(sb: SupabaseClient, table: string, id: string): Promise<void> {
  const { error } = await sb.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export const api = {
  getTransaction: async (sb: SupabaseClient, id: string): Promise<Transaction | null> => {
    const row = unwrap<Transaction | null>(await sb.from('transactions').select('*').eq('id', id).maybeSingle());
    return row
      ? { ...row, amount: num(row.amount), transfer_amount: row.transfer_amount === null ? null : num(row.transfer_amount) }
      : null;
  },
  saveTransaction: (sb: SupabaseClient, row: Row<Transaction>, id?: string) =>
    id ? update<Transaction>(sb, 'transactions', id, row) : insert<Transaction>(sb, 'transactions', row),
  deleteTransaction: (sb: SupabaseClient, id: string) => remove(sb, 'transactions', id),

  saveAccount: (sb: SupabaseClient, row: Row<Account>, id?: string) =>
    id ? update<Account>(sb, 'accounts', id, row) : insert<Account>(sb, 'accounts', row),
  deleteAccount: (sb: SupabaseClient, id: string) => remove(sb, 'accounts', id),

  saveCategory: (sb: SupabaseClient, row: Row<Category>, id?: string) =>
    id ? update<Category>(sb, 'categories', id, row) : insert<Category>(sb, 'categories', row),
  deleteCategory: (sb: SupabaseClient, id: string) => remove(sb, 'categories', id),

  saveBudget: async (sb: SupabaseClient, row: { category_id: string; amount: number; currency: Currency }) =>
    unwrap<Budget>(await sb.from('budgets').upsert(row, { onConflict: 'user_id,category_id' }).select().single()),
  deleteBudget: (sb: SupabaseClient, id: string) => remove(sb, 'budgets', id),

  saveGoal: (sb: SupabaseClient, row: Row<Goal>, id?: string) =>
    id ? update<Goal>(sb, 'goals', id, row) : insert<Goal>(sb, 'goals', row),
  deleteGoal: (sb: SupabaseClient, id: string) => remove(sb, 'goals', id),

  saveRecurring: (sb: SupabaseClient, row: Row<Recurring>, id?: string) =>
    id ? update<Recurring>(sb, 'recurring', id, row) : insert<Recurring>(sb, 'recurring', row),
  deleteRecurring: (sb: SupabaseClient, id: string) => remove(sb, 'recurring', id),
  postRecurring: async (sb: SupabaseClient, id: string) => {
    const { error } = await sb.rpc('post_recurring', { p_id: id });
    if (error) throw new Error(error.message);
  },

  updateProfile: async (sb: SupabaseClient, id: string, row: Partial<Pick<Profile, 'full_name' | 'base_currency' | 'onboarded'>>) =>
    unwrap<Profile>(await sb.from('profiles').update(row).eq('id', id).select().single()),
};

/** Human-friendly message for errors coming from Postgres/Supabase. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(msg)) return 'Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.';
  if (/User already registered/i.test(msg)) return 'Ya existe una cuenta con ese correo. Entra con tu contraseña.';
  if (/Password should be/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/rate limit/i.test(msg)) return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.';
  if (/duplicate key.*categories/i.test(msg)) return 'Ya tienes una categoría con ese nombre.';
  if (/duplicate key/i.test(msg)) return 'Ese registro ya existe.';
  if (/Failed to fetch|Network/i.test(msg)) return 'Sin conexión. Revisa tu internet y vuelve a intentarlo.';
  return msg;
}

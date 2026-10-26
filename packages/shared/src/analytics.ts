import { convert, roundMoney } from './money';
import { daysBetween, daysInMonth, lastMonths, monthKey, type MonthKey } from './dates';
import type {
  Account,
  AccountBalance,
  Budget,
  Category,
  Currency,
  Goal,
  RateTable,
  Recurring,
  Transaction,
} from './types';

/** Resolve a transaction's currency through its account. */
export function txCurrency(tx: Transaction, accounts: ReadonlyMap<string, Account>): Currency | null {
  return accounts.get(tx.account_id)?.currency ?? null;
}

function toBase(amount: number, from: Currency | null, base: Currency, rates: RateTable): number {
  if (!from) return 0;
  return convert(amount, from, base, rates) ?? 0;
}

export interface PeriodSummary {
  income: number;
  expense: number;
  net: number;
  /** Share of income kept, 0..1 (can be negative). null when no income. */
  savingsRate: number | null;
  count: number;
}

export function summarize(
  txs: readonly Transaction[],
  accounts: ReadonlyMap<string, Account>,
  base: Currency,
  rates: RateTable,
): PeriodSummary {
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const tx of txs) {
    if (tx.kind === 'transfer') continue;
    const v = toBase(tx.amount, txCurrency(tx, accounts), base, rates);
    if (tx.kind === 'income') income += v;
    else expense += v;
    count++;
  }
  income = roundMoney(income, base);
  expense = roundMoney(expense, base);
  const net = roundMoney(income - expense, base);
  return { income, expense, net, savingsRate: income > 0 ? net / income : null, count };
}

export interface CategorySlice {
  categoryId: string | null;
  name: string;
  color: string;
  total: number;
  share: number;
}

export function byCategory(
  txs: readonly Transaction[],
  kind: 'income' | 'expense',
  categories: ReadonlyMap<string, Category>,
  accounts: ReadonlyMap<string, Account>,
  base: Currency,
  rates: RateTable,
): CategorySlice[] {
  const totals = new Map<string | null, number>();
  for (const tx of txs) {
    if (tx.kind !== kind) continue;
    const v = toBase(tx.amount, txCurrency(tx, accounts), base, rates);
    totals.set(tx.category_id, (totals.get(tx.category_id) ?? 0) + v);
  }
  const grand = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([id, total]) => {
      const c = id ? categories.get(id) : undefined;
      return {
        categoryId: id,
        name: c?.name ?? 'Sin categoría',
        color: c?.color ?? '#8A94A6',
        total: roundMoney(total, base),
        share: grand > 0 ? total / grand : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export interface MonthPoint {
  month: MonthKey;
  income: number;
  expense: number;
  net: number;
}

export function monthlySeries(
  txs: readonly Transaction[],
  endMonth: MonthKey,
  months: number,
  accounts: ReadonlyMap<string, Account>,
  base: Currency,
  rates: RateTable,
): MonthPoint[] {
  const keys = lastMonths(endMonth, months);
  const buckets = new Map<MonthKey, Transaction[]>(keys.map((k) => [k, []]));
  for (const tx of txs) buckets.get(monthKey(tx.occurred_on))?.push(tx);
  return keys.map((k) => {
    const s = summarize(buckets.get(k) ?? [], accounts, base, rates);
    return { month: k, income: s.income, expense: s.expense, net: s.net };
  });
}

export interface NetWorth {
  total: number;
  assets: number;
  liabilities: number;
  byCurrency: Partial<Record<Currency, number>>;
}

export function netWorth(
  balances: readonly AccountBalance[],
  accounts: ReadonlyMap<string, Account>,
  base: Currency,
  rates: RateTable,
): NetWorth {
  let assets = 0;
  let liabilities = 0;
  const byCurrency: Partial<Record<Currency, number>> = {};
  for (const b of balances) {
    const acc = accounts.get(b.account_id);
    if (!acc || acc.archived) continue;
    byCurrency[b.currency] = roundMoney((byCurrency[b.currency] ?? 0) + b.balance, b.currency);
    const v = toBase(b.balance, b.currency, base, rates);
    if (v >= 0) assets += v;
    else liabilities += -v;
  }
  return {
    total: roundMoney(assets - liabilities, base),
    assets: roundMoney(assets, base),
    liabilities: roundMoney(liabilities, base),
    byCurrency,
  };
}

export type BudgetStatus = 'ok' | 'warning' | 'over';

export interface BudgetProgress {
  budget: Budget;
  category: Category | undefined;
  spent: number;
  remaining: number;
  ratio: number;
  /** Where spending should be by today if spread evenly through the month. */
  pace: number;
  status: BudgetStatus;
}

/**
 * Computes budget usage for a month. `dayOfMonth` lets the UI compare against
 * an even pace (e.g. day 15 of 30 → 50% expected).
 */
export function budgetProgress(
  budgets: readonly Budget[],
  monthTxs: readonly Transaction[],
  categories: ReadonlyMap<string, Category>,
  accounts: ReadonlyMap<string, Account>,
  rates: RateTable,
  month: MonthKey,
  dayOfMonth: number,
): BudgetProgress[] {
  const pace = Math.min(1, Math.max(0, dayOfMonth / daysInMonth(month)));
  return budgets
    .map((budget) => {
      let spent = 0;
      for (const tx of monthTxs) {
        if (tx.kind !== 'expense' || tx.category_id !== budget.category_id) continue;
        spent += toBase(tx.amount, txCurrency(tx, accounts), budget.currency, rates);
      }
      spent = roundMoney(spent, budget.currency);
      const ratio = spent / budget.amount;
      const status: BudgetStatus = ratio >= 1 ? 'over' : ratio > pace + 0.1 ? 'warning' : 'ok';
      return {
        budget,
        category: categories.get(budget.category_id),
        spent,
        remaining: roundMoney(budget.amount - spent, budget.currency),
        ratio,
        pace,
        status,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

export interface GoalProgress {
  goal: Goal;
  ratio: number;
  remaining: number;
  /** Amount to save per month to reach the target by target_date. */
  monthlyNeeded: number | null;
  daysLeft: number | null;
}

export function goalProgress(goal: Goal, today: string): GoalProgress {
  const remaining = Math.max(0, goal.target_amount - goal.saved_amount);
  const ratio = Math.min(1, goal.saved_amount / goal.target_amount);
  let monthlyNeeded: number | null = null;
  let daysLeft: number | null = null;
  if (goal.target_date) {
    daysLeft = daysBetween(today, goal.target_date);
    const monthsLeft = Math.max(1, daysLeft / 30.4375);
    monthlyNeeded = daysLeft > 0 ? roundMoney(remaining / monthsLeft, goal.currency) : remaining;
  }
  return { goal, ratio, remaining: roundMoney(remaining, goal.currency), monthlyNeeded, daysLeft };
}

/** Recurring items due on or before `until`, sorted by date. */
export function upcoming(items: readonly Recurring[], until: string): Recurring[] {
  return items
    .filter((r) => r.active && r.next_date <= until)
    .sort((a, b) => a.next_date.localeCompare(b.next_date));
}

/** Monthly equivalent of a recurring amount. */
export function monthlyEquivalent(r: Pick<Recurring, 'amount' | 'cadence'>): number {
  switch (r.cadence) {
    case 'weekly':
      return (r.amount * 52) / 12;
    case 'biweekly':
      return (r.amount * 26) / 12;
    case 'monthly':
      return r.amount;
    case 'yearly':
      return r.amount / 12;
  }
}

export function indexBy<T extends { id: string }>(rows: readonly T[]): Map<string, T> {
  return new Map(rows.map((r) => [r.id, r]));
}

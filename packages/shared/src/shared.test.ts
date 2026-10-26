import { describe, expect, it } from 'vitest';
import {
  budgetProgress,
  byCategory,
  convert,
  formatMoney,
  goalProgress,
  indexBy,
  lastMonths,
  monthRange,
  monthlyEquivalent,
  monthlySeries,
  netWorth,
  parseAmount,
  roundMoney,
  shiftMonth,
  summarize,
  sumIn,
  transactionRow,
  validateTransaction,
  type Account,
  type Budget,
  type Category,
  type Goal,
  type RateTable,
  type Transaction,
} from './index';

const rates: RateTable = { USD: 1, COP: 4000, EUR: 0.9 };

const acc = (id: string, currency: Account['currency'], extra: Partial<Account> = {}): Account => ({
  id, user_id: 'u', name: id, kind: 'checking', currency, opening_balance: 0, color: '#000000',
  archived: false, created_at: '', ...extra,
});
const cat = (id: string, kind: Category['kind']): Category => ({
  id, user_id: 'u', name: id, kind, color: '#111111', icon: 'tag', archived: false, created_at: '',
});
let n = 0;
const tx = (p: Partial<Transaction>): Transaction => ({
  id: `t${n++}`, user_id: 'u', kind: 'expense', account_id: 'cop', amount: 0, category_id: null,
  transfer_account_id: null, transfer_amount: null, occurred_on: '2026-10-10', note: null,
  recurring_id: null, created_at: '', ...p,
});

const accounts = indexBy([acc('cop', 'COP'), acc('usd', 'USD'), acc('card', 'COP', { kind: 'credit_card' })]);
const categories = indexBy([cat('food', 'expense'), cat('rent', 'expense'), cat('salary', 'income')]);

describe('money', () => {
  it('rounds COP to whole pesos and USD to cents', () => {
    expect(roundMoney(1234.6, 'COP')).toBe(1235);
    expect(roundMoney(1.005, 'USD')).toBe(1.01);
  });

  it('parses Colombian and US formats', () => {
    expect(parseAmount('1.250.000')).toBe(1250000);
    expect(parseAmount('1,250,000.50')).toBe(1250000.5);
    expect(parseAmount('1250000,5')).toBe(1250000.5);
    expect(parseAmount('$ 45.000')).toBe(45000);
    expect(parseAmount('12.5')).toBe(12.5);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });

  it('converts through USD and reports missing rates', () => {
    expect(convert(100, 'USD', 'COP', rates)).toBe(400000);
    expect(convert(400000, 'COP', 'EUR', rates)).toBeCloseTo(90);
    expect(convert(1, 'MXN', 'COP', rates)).toBeNull();
    const s = sumIn([{ amount: 10, currency: 'USD' }, { amount: 5, currency: 'MXN' }], 'COP', rates);
    expect(s.total).toBe(40000);
    expect(s.missing).toEqual(['MXN']);
  });

  it('formats without decimals for COP', () => {
    expect(formatMoney(1250000, 'COP')).toMatch(/1\.250\.000/);
    expect(formatMoney(12.5, 'USD')).toMatch(/12,50/);
    expect(formatMoney(12.5, 'USD')).toContain('USD');
  });
});

describe('dates', () => {
  it('handles month math across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(lastMonths('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });
});

describe('analytics', () => {
  const txs = [
    tx({ kind: 'income', account_id: 'usd', amount: 1000, category_id: 'salary' }),
    tx({ kind: 'expense', account_id: 'cop', amount: 400000, category_id: 'food' }),
    tx({ kind: 'expense', account_id: 'cop', amount: 800000, category_id: 'rent' }),
    tx({ kind: 'transfer', account_id: 'usd', amount: 100, transfer_account_id: 'cop', transfer_amount: 400000 }),
    tx({ kind: 'expense', account_id: 'cop', amount: 100000, category_id: 'food', occurred_on: '2026-09-02' }),
  ];

  it('summarizes in base currency ignoring transfers', () => {
    const oct = txs.filter((t) => t.occurred_on.startsWith('2026-10'));
    const s = summarize(oct, accounts, 'COP', rates);
    expect(s.income).toBe(4_000_000);
    expect(s.expense).toBe(1_200_000);
    expect(s.net).toBe(2_800_000);
    expect(s.savingsRate).toBeCloseTo(0.7);
  });

  it('breaks spending down by category', () => {
    const slices = byCategory(txs, 'expense', categories, accounts, 'COP', rates);
    expect(slices[0]?.categoryId).toBe('rent');
    expect(slices[1]?.total).toBe(500000);
    expect(slices.reduce((a, b) => a + b.share, 0)).toBeCloseTo(1);
  });

  it('builds a monthly series', () => {
    const series = monthlySeries(txs, '2026-10', 2, accounts, 'USD', rates);
    expect(series.map((p) => p.month)).toEqual(['2026-09', '2026-10']);
    expect(series[0]?.expense).toBe(25);
    expect(series[1]?.income).toBe(1000);
  });

  it('splits net worth into assets and liabilities', () => {
    const nw = netWorth(
      [
        { account_id: 'cop', user_id: 'u', currency: 'COP', balance: 2_000_000 },
        { account_id: 'usd', user_id: 'u', currency: 'USD', balance: 500 },
        { account_id: 'card', user_id: 'u', currency: 'COP', balance: -400_000 },
      ],
      accounts, 'COP', rates,
    );
    expect(nw.assets).toBe(4_000_000);
    expect(nw.liabilities).toBe(400_000);
    expect(nw.total).toBe(3_600_000);
    expect(nw.byCurrency.COP).toBe(1_600_000);
  });

  it('flags budgets that run ahead of pace', () => {
    const budgets: Budget[] = [
      { id: 'b1', user_id: 'u', category_id: 'food', amount: 500000, currency: 'COP', created_at: '' },
      { id: 'b2', user_id: 'u', category_id: 'rent', amount: 700000, currency: 'COP', created_at: '' },
    ];
    const oct = txs.filter((t) => t.occurred_on.startsWith('2026-10'));
    const p = budgetProgress(budgets, oct, categories, accounts, rates, '2026-10', 10);
    expect(p[0]?.budget.id).toBe('b2');
    expect(p[0]?.status).toBe('over');
    expect(p[1]?.status).toBe('warning');
    expect(p[1]?.remaining).toBe(100000);
  });

  it('computes what a goal needs per month', () => {
    const goal: Goal = {
      id: 'g', user_id: 'u', name: 'Viaje', target_amount: 1200, saved_amount: 200, currency: 'USD',
      target_date: '2027-10-26', color: '#000000', archived: false, created_at: '',
    };
    const g = goalProgress(goal, '2026-10-26');
    expect(g.remaining).toBe(1000);
    expect(g.monthlyNeeded).toBeCloseTo(83.3, 0);
  });

  it('normalizes recurring amounts to monthly', () => {
    expect(monthlyEquivalent({ amount: 120, cadence: 'yearly' })).toBe(10);
    expect(monthlyEquivalent({ amount: 100, cadence: 'biweekly' })).toBeCloseTo(216.67, 1);
  });
});

describe('validation', () => {
  const base = {
    kind: 'expense' as const, account_id: 'cop', amount: 10, category_id: 'food',
    transfer_account_id: null, transfer_amount: null, occurred_on: '2026-10-26', note: '',
  };

  it('accepts a valid expense', () => {
    expect(validateTransaction(base)).toEqual({});
  });

  it('rejects transfers to the same account', () => {
    const e = validateTransaction({ ...base, kind: 'transfer', transfer_account_id: 'cop' });
    expect(e.transfer_account_id).toBeDefined();
  });

  it('fills transfer_amount when currencies match', () => {
    const row = transactionRow({ ...base, kind: 'transfer', transfer_account_id: 'card' }, true);
    expect(row.transfer_amount).toBe(10);
    expect(row.category_id).toBeNull();
  });
});

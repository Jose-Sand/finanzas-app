import type { Currency, RateTable } from './types';

const ZERO_DECIMAL: ReadonlySet<Currency> = new Set(['COP', 'CLP']);

export function fractionDigits(currency: Currency): number {
  return ZERO_DECIMAL.has(currency) ? 0 : 2;
}

/** Rounds to the currency's minor unit, avoiding float drift (e.g. 1.005). */
export function roundMoney(value: number, currency: Currency): number {
  const d = fractionDigits(currency);
  const f = 10 ** d;
  return Math.round((value + Number.EPSILON) * f) / f;
}

export interface FormatOptions {
  /** Show only symbol-less number. */
  plain?: boolean;
  /** Compact notation for charts, e.g. "$ 1,2 M". */
  compact?: boolean;
  /** Always show + or − sign. */
  signed?: boolean;
}

export function formatMoney(value: number, currency: Currency, opts: FormatOptions = {}): string {
  const d = fractionDigits(currency);
  const nf = new Intl.NumberFormat('es-CO', {
    style: opts.plain ? 'decimal' : 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: opts.compact ? 0 : d,
    maximumFractionDigits: opts.compact ? 1 : d,
    notation: opts.compact ? 'compact' : 'standard',
    signDisplay: opts.signed ? 'exceptZero' : 'auto',
  });
  const out = nf.format(roundMoney(value, currency));
  // Disambiguate dollar-sign currencies when not COP.
  if (!opts.plain && currency !== 'COP' && out.includes('$') && !out.includes(currency)) {
    return `${out} ${currency}`;
  }
  return out;
}

/** Parses user input like "1.250.000", "1,250,000.50", "1250000,5" into a number. */
export function parseAmount(input: string): number | null {
  const s = input.trim().replace(/[^\d.,-]/g, '');
  if (!s || s === '-' ) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let normalized: string;
  if (lastDot === -1 && lastComma === -1) {
    normalized = s;
  } else if (lastComma > lastDot) {
    // comma is decimal separator if followed by 1-2 digits, else thousands
    const tail = s.slice(lastComma + 1);
    normalized = tail.length <= 2 ? s.replace(/\./g, '').replace(',', '.') : s.replace(/[.,]/g, '');
  } else {
    const tail = s.slice(lastDot + 1);
    const dotCount = (s.match(/\./g) ?? []).length;
    normalized = tail.length <= 2 && dotCount === 1 ? s.replace(/,/g, '') : s.replace(/[.,]/g, '');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Converts between currencies using a table of units-per-USD. Returns null if a rate is missing. */
export function convert(amount: number, from: Currency, to: Currency, rates: RateTable): number | null {
  if (from === to) return amount;
  const fromRate = from === 'USD' ? 1 : rates[from];
  const toRate = to === 'USD' ? 1 : rates[to];
  if (!fromRate || !toRate) return null;
  return (amount / fromRate) * toRate;
}

/** Rate expressed as "1 FROM = X TO". */
export function crossRate(from: Currency, to: Currency, rates: RateTable): number | null {
  return convert(1, from, to, rates);
}

export function sumIn(
  items: ReadonlyArray<{ amount: number; currency: Currency }>,
  to: Currency,
  rates: RateTable,
): { total: number; missing: Currency[] } {
  let total = 0;
  const missing = new Set<Currency>();
  for (const it of items) {
    const v = convert(it.amount, it.currency, to, rates);
    if (v === null) missing.add(it.currency);
    else total += v;
  }
  return { total: roundMoney(total, to), missing: [...missing] };
}

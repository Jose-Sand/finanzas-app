"use client";

import { crossRate, formatMoney, netWorth, type Currency } from "@caudal/shared";
import { useFinance } from "./finance-provider";

function ago(iso: string | null): string {
  if (!iso) return "sin datos";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

/**
 * The signature element: net worth in the base currency, the per-currency
 * pools that feed it, and the rate that ties them together.
 */
export function BalanceBand() {
  const { data, accountsById } = useFinance();
  if (!data) return null;
  const base = data.profile.base_currency;
  const nw = netWorth(data.balances, accountsById, base, data.rates);
  const pools = (Object.entries(nw.byCurrency) as Array<[Currency, number]>).sort((a, b) => (a[0] === base ? -1 : b[0] === base ? 1 : 0));
  const foreign = pools.find(([c]) => c !== base)?.[0] ?? (base === "COP" ? "USD" : "COP");
  const rate = crossRate(foreign, base, data.rates);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#1C2541] px-6 py-7 text-[#F3F5F9] ring-1 ring-white/5 md:px-9 md:py-9">
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-60" viewBox="0 0 800 96" preserveAspectRatio="none" aria-hidden>
        <path className="flow-line" d="M0 60 C 120 20, 220 90, 360 54 S 600 20, 800 58" fill="none" stroke="var(--mango)" strokeWidth="2" />
        <path d="M0 76 C 140 46, 260 100, 400 70 S 640 44, 800 74" fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth="2" />
      </svg>

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm opacity-70">Patrimonio neto en {base}</p>
          <p className="num mt-1 font-display text-4xl font-semibold tracking-tight md:text-6xl">{formatMoney(nw.total, base)}</p>
          <p className="num mt-2 text-sm opacity-70">
            Tienes {formatMoney(nw.assets, base)}
            {nw.liabilities > 0 ? ` y debes ${formatMoney(nw.liabilities, base)}` : ""}
          </p>
        </div>

        {rate ? (
          <div className="rounded-2xl bg-white/8 px-4 py-3 ring-1 ring-white/12">
            <p className="num font-display text-xl font-semibold">
              1 {foreign} = {formatMoney(rate, base, { plain: true })} {base}
            </p>
            <p className="text-xs opacity-60">Tasa actualizada {ago(data.ratesFetchedAt)}</p>
          </div>
        ) : null}
      </div>

      {pools.length > 1 ? (
        <ul className="relative mt-7 flex flex-wrap gap-x-8 gap-y-2">
          {pools.map(([cur, amt]) => (
            <li key={cur} className="text-sm">
              <span className="opacity-60">En {cur} </span>
              <span className="num font-medium">{formatMoney(amt, cur)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

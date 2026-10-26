"use client";

import { useEffect, useState } from "react";
import { convert, CURRENCIES, formatMoney, parseAmount, type Currency, type RateTable } from "@caudal/shared";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Live demo on the landing page: the real rate the app uses, applied to your own number. */
export function LandingConverter() {
  const [rates, setRates] = useState<RateTable | null>(null);
  const [amount, setAmount] = useState("2.500");
  const [from, setFrom] = useState<Currency>("USD");
  const [to, setTo] = useState<Currency>("COP");

  useEffect(() => {
    supabaseBrowser()
      .from("fx_rates")
      .select("quote, per_usd")
      .then(({ data }) => {
        if (!data) return;
        const t: RateTable = {};
        for (const r of data) t[r.quote as Currency] = Number(r.per_usd);
        setRates(t);
      });
  }, []);

  const v = parseAmount(amount) ?? 0;
  const out = rates ? convert(v, from, to, rates) : null;
  const unit = rates ? convert(1, from, to, rates) : null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#1C2541] p-6 text-[#F3F5F9] shadow-card md:p-8">
      <svg className="pointer-events-none absolute inset-x-0 top-1/2 h-28 w-full -translate-y-1/2 opacity-70" viewBox="0 0 600 112" preserveAspectRatio="none" aria-hidden>
        <path className="flow-line" d="M0 56 C 100 10, 200 100, 300 56 S 500 10, 600 56" fill="none" stroke="#F2A541" strokeWidth="2" />
      </svg>

      <label className="relative block text-sm opacity-70" htmlFor="demo-amount">
        Te pagan
      </label>
      <div className="relative mt-2 flex items-center gap-3">
        <input
          id="demo-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="num w-full min-w-0 bg-transparent font-display text-4xl font-semibold outline-none md:text-5xl"
        />
        <select
          aria-label="Moneda de origen"
          value={from}
          onChange={(e) => setFrom(e.target.value as Currency)}
          className="rounded-lg bg-white/10 px-2 py-1.5 text-sm font-medium"
        >
          {CURRENCIES.map((c) => (
            <option key={c} className="text-[#1C2541]">
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="relative my-10 h-px" aria-hidden />

      <p className="relative text-sm opacity-70">Te llegan</p>
      <div className="relative mt-2 flex items-center gap-3">
        <p className="num min-w-0 flex-1 truncate font-display text-4xl font-semibold text-[#F5B45A] md:text-5xl" aria-live="polite">
          {out !== null ? formatMoney(out, to, { plain: true }) : "…"}
        </p>
        <select
          aria-label="Moneda de destino"
          value={to}
          onChange={(e) => setTo(e.target.value as Currency)}
          className="rounded-lg bg-white/10 px-2 py-1.5 text-sm font-medium"
        >
          {CURRENCIES.map((c) => (
            <option key={c} className="text-[#1C2541]">
              {c}
            </option>
          ))}
        </select>
      </div>
      <p className="relative mt-6 text-sm opacity-60">
        {unit ? `Tasa de hoy: 1 ${from} = ${formatMoney(unit, to, { plain: true })} ${to}` : "Cargando la tasa de hoy…"}
      </p>
    </div>
  );
}

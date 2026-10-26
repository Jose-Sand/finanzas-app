"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, monthLabel, type Currency, type MonthPoint } from "@caudal/shared";

export function CashflowChart({ data, currency }: { data: MonthPoint[]; currency: Currency }) {
  const rows = data.map((p) => ({ ...p, label: monthLabel(p.month) }));
  return (
    <div className="h-64 w-full" role="img" aria-label="Ingresos y gastos de los últimos meses">
      <ResponsiveContainer>
        <BarChart data={rows} barGap={4} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--faint)", fontSize: 11 }}
            tickFormatter={(v: number) => formatMoney(v, currency, { compact: true })}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-alt)" }}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--ink)" }}
            labelStyle={{ color: "var(--muted)", marginBottom: 4 }}
            formatter={(v, name) => [formatMoney(Number(v), currency), name === "income" ? "Ingresos" : "Gastos"]}
          />
          <Bar dataKey="income" fill="var(--income)" radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expense" fill="var(--expense)" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

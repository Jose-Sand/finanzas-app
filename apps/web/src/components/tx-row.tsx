"use client";

import { ArrowRight } from "lucide-react";
import { dayLabel, type Transaction } from "@caudal/shared";
import { useFinance } from "./finance-provider";
import { useTxSheet } from "./app-shell";
import { Dot, Money } from "./ui";

export function TxRow({ tx, showDate = true }: { tx: Transaction; showDate?: boolean }) {
  const { accountsById, categoriesById } = useFinance();
  const { openTx } = useTxSheet();
  const account = accountsById.get(tx.account_id);
  const target = tx.transfer_account_id ? accountsById.get(tx.transfer_account_id) : undefined;
  const category = tx.category_id ? categoriesById.get(tx.category_id) : undefined;
  if (!account) return null;

  const title =
    tx.kind === "transfer" ? (
      <span className="inline-flex items-center gap-1.5">
        {account.name} <ArrowRight className="size-3.5 text-faint" /> {target?.name ?? "Cuenta eliminada"}
      </span>
    ) : (
      tx.note || category?.name || (tx.kind === "income" ? "Ingreso" : "Gasto")
    );

  const subtitle =
    tx.kind === "transfer"
      ? tx.note || "Transferencia"
      : [tx.note ? category?.name ?? "Sin categoría" : null, account.name].filter(Boolean).join(" · ");

  return (
    <li>
      <button
        onClick={() => openTx({ editing: tx })}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-alt"
      >
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full"
          style={{ background: `color-mix(in srgb, ${tx.kind === "transfer" ? "var(--muted)" : category?.color ?? "#8A94A6"} 16%, transparent)` }}
        >
          <Dot color={tx.kind === "transfer" ? "var(--muted)" : category?.color ?? "#8A94A6"} className="size-3" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{title}</span>
          <span className="block truncate text-sm text-muted">
            {showDate ? `${dayLabel(tx.occurred_on)} · ` : ""}
            {subtitle}
          </span>
        </span>
        <span className="text-right">
          <Money
            value={tx.kind === "expense" ? -tx.amount : tx.amount}
            currency={account.currency}
            signed={tx.kind !== "transfer"}
            tone={tx.kind === "income" ? "income" : "plain"}
            className="font-medium"
          />
          {tx.kind === "transfer" && target && target.currency !== account.currency && tx.transfer_amount ? (
            <span className="block text-sm text-muted">
              <Money value={tx.transfer_amount} currency={target.currency} />
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

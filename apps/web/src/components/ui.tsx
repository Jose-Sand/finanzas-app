"use client";

import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { X } from "lucide-react";
import { formatMoney, type Currency } from "@caudal/shared";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  loading,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
  const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-[15px]", lg: "h-12 px-5 text-base" };
  const variants: Record<Variant, string> = {
    primary: "bg-mango text-mango-ink hover:brightness-95",
    secondary: "bg-surface text-ink border border-line hover:bg-surface-alt",
    ghost: "text-muted hover:text-ink hover:bg-surface-alt",
    danger: "text-expense border border-line bg-surface hover:bg-expense hover:text-white hover:border-expense",
  };
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="size-4 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-expense" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

const control =
  "h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-faint focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25 aria-[invalid=true]:border-expense";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(control, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(control, "appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238E99AD' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...rest}>
      {children}
    </select>
  );
}

export function Money({
  value,
  currency,
  className,
  signed,
  tone,
  compact,
}: {
  value: number;
  currency: Currency;
  className?: string;
  signed?: boolean;
  compact?: boolean;
  tone?: "auto" | "income" | "expense" | "plain";
}) {
  const color =
    tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : tone === "auto" ? (value < 0 ? "text-expense" : value > 0 ? "text-income" : "") : "";
  return <span className={cx("num", color, className)}>{formatMoney(value, currency, { signed, compact })}</span>;
}

export function Progress({ ratio, tone = "ink", marker }: { ratio: number; tone?: "ink" | "income" | "warning" | "expense" | "mango"; marker?: number }) {
  const fill = { ink: "bg-ink", income: "bg-income", warning: "bg-warning", expense: "bg-expense", mango: "bg-mango" }[tone];
  return (
    <div className="relative h-2 w-full rounded-full bg-surface-alt" role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full", fill)} style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }} />
      {marker !== undefined ? (
        <div className="absolute -top-1 h-4 w-0.5 rounded bg-muted/70" style={{ left: `${Math.min(100, marker * 100)}%` }} title="Ritmo esperado a hoy" />
      ) : null}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx("rounded-2xl border border-line bg-surface p-5", className)}>{children}</section>;
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line px-6 py-10">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="max-w-md text-muted">{body}</p>
      {action}
    </div>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return <span className={cx("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ background: color }} aria-hidden />;
}

/** Side sheet on desktop, bottom sheet on phones. */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-close])");
    first?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
      <div className="absolute inset-0 bg-[#0b1020]/45 animate-fade" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-surface shadow-card sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-l-3xl"
      >
        <header className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 id={titleId} className="font-display text-xl font-semibold">
            {title}
          </h2>
          <button data-close onClick={onClose} className="rounded-full p-2 text-muted hover:bg-surface-alt hover:text-ink" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer ? <footer className="border-t border-line px-6 py-4">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }>; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-surface-alt p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-9 rounded-[9px] text-sm font-medium transition-colors",
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 64 64" className="size-7" aria-hidden>
        <rect width="64" height="64" rx="16" fill="var(--ink)" />
        <path d="M10 38c8-10 14-10 22 0s14 10 22 0" fill="none" stroke="var(--mango)" strokeWidth="6" strokeLinecap="round" />
        <path d="M10 24c8-10 14-10 22 0s14 10 22 0" fill="none" stroke="var(--bg)" strokeWidth="6" strokeLinecap="round" opacity=".6" />
      </svg>
      Caudal
    </span>
  );
}

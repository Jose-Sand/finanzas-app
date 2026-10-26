"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { friendlyError } from "@caudal/shared";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button, Field, Input, Logo } from "./ui";

type Mode = "signin" | "signup" | "reset";

export function AuthForm({ mode: initial }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(params.get("error") === "enlace" ? "El enlace expiró o ya se usó. Entra con tu contraseña o pide uno nuevo." : null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = params.get("siguiente");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/panel";
  const callback = () => `${window.location.origin}/auth/callback?siguiente=${encodeURIComponent(safeNext)}`;

  async function submit() {
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Escribe un correo válido.");
    if (mode !== "reset" && password.length < (mode === "signup" ? 8 : 1)) {
      return setError(mode === "signup" ? "La contraseña debe tener al menos 8 caracteres." : "Escribe tu contraseña.");
    }
    setBusy(true);
    const sb = supabaseBrowser();
    try {
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(safeNext);
        router.refresh();
        return;
      }
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() || undefined }, emailRedirectTo: callback() },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/panel");
          router.refresh();
          return;
        }
        setNotice(`Te enviamos un enlace a ${email}. Ábrelo para activar tu cuenta.`);
        return;
      }
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback` });
      if (error) throw error;
      setNotice(`Si ${email} tiene una cuenta, te llegará un enlace para crear una contraseña nueva.`);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, string> = {
    signin: "Entra a tu cuenta",
    signup: "Crea tu cuenta",
    reset: "Recupera tu contraseña",
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-10">
        <Logo />
      </Link>
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{titles[mode]}</h1>
        {mode === "signup" ? <p className="mt-2 text-muted">Gratis. Solo necesitas un correo.</p> : null}

        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {mode === "signup" ? (
            <Field label="Nombre" htmlFor="a-name">
              <Input id="a-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          ) : null}
          <Field label="Correo" htmlFor="a-email">
            <Input id="a-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {mode !== "reset" ? (
            <Field label="Contraseña" htmlFor="a-pw" hint={mode === "signup" ? "Mínimo 8 caracteres." : undefined}>
              <Input
                id="a-pw"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-lg bg-expense/10 px-3 py-2 text-sm text-expense">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="rounded-lg bg-income/10 px-3 py-2 text-sm text-income">
              {notice}
            </p>
          ) : null}

          <Button type="submit" variant="primary" size="lg" loading={busy} className="mt-2">
            {mode === "signin" ? "Entrar" : mode === "signup" ? "Crear cuenta" : "Enviar enlace"}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-sm text-muted">
          {mode === "signin" ? (
            <>
              <p>
                ¿No tienes cuenta?{" "}
                <Link href="/registro" className="font-medium text-ink underline underline-offset-4">
                  Crea una
                </Link>
              </p>
              <button className="underline underline-offset-4 hover:text-ink" onClick={() => { setMode("reset"); setError(null); setNotice(null); }}>
                Olvidé mi contraseña
              </button>
            </>
          ) : mode === "signup" ? (
            <p>
              ¿Ya tienes cuenta?{" "}
              <Link href="/entrar" className="font-medium text-ink underline underline-offset-4">
                Entra
              </Link>
            </p>
          ) : (
            <button className="underline underline-offset-4 hover:text-ink" onClick={() => { setMode("signin"); setError(null); setNotice(null); }}>
              Volver a entrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

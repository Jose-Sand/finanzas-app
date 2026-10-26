"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  api,
  CURRENCIES,
  CURRENCY_NAME,
  friendlyError,
  SWATCHES,
  validateName,
  type Category,
  type CategoryKind,
  type Currency,
} from "@caudal/shared";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useFinance } from "@/components/finance-provider";
import { Button, Card, cx, Dot, Field, Input, PageHeader, Segmented, Select, Sheet } from "@/components/ui";

type Theme = "system" | "light" | "dark";

function readTheme(): Theme {
  try {
    const t = localStorage.getItem("caudal-theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}
const subscribeTheme = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

export default function AjustesPage() {
  const { data, refresh, toast } = useFinance();
  const router = useRouter();
  const profile = data!.profile;
  const [name, setName] = useState(profile.full_name ?? "");
  const [base, setBase] = useState<Currency>(profile.base_currency);
  const [busy, setBusy] = useState(false);
  const storedTheme = useSyncExternalStore(subscribeTheme, readTheme, () => "system" as Theme);
  const [themeOverride, setTheme] = useState<Theme | null>(null);
  const theme = themeOverride ?? storedTheme;
  const [password, setPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [catTab, setCatTab] = useState<CategoryKind>("expense");
  const [editingCat, setEditingCat] = useState<Category | null | undefined>(undefined);
  const [email, setEmail] = useState("");

  useEffect(() => {
    void supabaseBrowser().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  function applyTheme(t: Theme) {
    setTheme(t);
    try {
      if (t === "system") localStorage.removeItem("caudal-theme");
      else localStorage.setItem("caudal-theme", t);
    } catch {}
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }

  async function saveProfile() {
    setBusy(true);
    try {
      await api.updateProfile(supabaseBrowser(), profile.id, { full_name: name.trim() || null, base_currency: base });
      await refresh();
      toast("Perfil guardado");
    } catch (e) {
      toast(friendlyError(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (password.length < 8) return toast("Usa al menos 8 caracteres.", "error");
    setPwBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setPwBusy(false);
    if (error) return toast(friendlyError(error), "error");
    setPassword("");
    toast("Contraseña actualizada");
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace("/entrar");
    router.refresh();
  }

  const cats = data!.categories.filter((c) => c.kind === catTab).sort((a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name));

  return (
    <div className="max-w-3xl">
      <PageHeader title="Ajustes" />
      <div className="space-y-6">
        <Card>
          <h2 className="font-display text-lg font-semibold">Perfil</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="p-name">
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </Field>
            <Field label="Moneda principal" htmlFor="p-base" hint="Los totales y gráficas se muestran en esta moneda.">
              <Select id="p-base" value={base} onChange={(e) => setBase(e.target.value as Currency)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c} · {CURRENCY_NAME[c]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="primary" onClick={saveProfile} loading={busy}>
              Guardar perfil
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Categorías</h2>
            <Button size="sm" onClick={() => setEditingCat(null)}>
              <Plus className="size-4" /> Nueva categoría
            </Button>
          </div>
          <div className="mt-4 max-w-xs">
            <Segmented
              label="Tipo de categoría"
              value={catTab}
              onChange={setCatTab}
              options={[
                { value: "expense", label: "Gastos" },
                { value: "income", label: "Ingresos" },
              ]}
            />
          </div>
          <ul className="mt-4 grid gap-1 sm:grid-cols-2">
            {cats.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setEditingCat(c)}
                  className={cx("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-alt", c.archived && "text-faint")}
                >
                  <Dot color={c.color} />
                  <span className="flex-1 truncate">{c.name}</span>
                  {c.archived ? <span className="text-xs">Archivada</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold">Apariencia</h2>
          <div className="mt-4 max-w-sm">
            <Segmented
              label="Tema"
              value={theme}
              onChange={applyTheme}
              options={[
                { value: "system", label: "Sistema" },
                { value: "light", label: "Claro" },
                { value: "dark", label: "Oscuro" },
              ]}
            />
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold">Cuenta</h2>
          <p className="mt-1 text-muted">{email}</p>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void changePassword();
            }}
          >
            <div className="min-w-56 flex-1">
              <Field label="Nueva contraseña" htmlFor="p-pw">
                <Input id="p-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            </div>
            <Button type="submit" loading={pwBusy}>
              Cambiar contraseña
            </Button>
          </form>
          <div className="mt-6 border-t border-line pt-4">
            <Button variant="ghost" onClick={signOut}>
              Salir de Caudal
            </Button>
          </div>
        </Card>
      </div>

      <CategorySheet category={editingCat} kind={catTab} onClose={() => setEditingCat(undefined)} />
    </div>
  );
}

function CategorySheet({ category, kind, onClose }: { category: Category | null | undefined; kind: CategoryKind; onClose: () => void }) {
  const { refresh, toast } = useFinance();
  const open = category !== undefined;
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(SWATCHES[0]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = open ? category?.id ?? `new-${kind}` : null;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setName(category?.name ?? "");
      setColor(category?.color ?? SWATCHES[0]);
      setErr(null);
    }
  }

  async function save() {
    const e = validateName(name, 40);
    if (e) return setErr(e);
    setBusy(true);
    try {
      await api.saveCategory(supabaseBrowser(), category ? { name: name.trim(), color } : { name: name.trim(), color, kind }, category?.id);
      await refresh();
      toast(category ? "Categoría actualizada" : "Categoría creada");
      onClose();
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    if (!category) return;
    setBusy(true);
    try {
      await api.saveCategory(supabaseBrowser(), { archived: !category.archived }, category.id);
      await refresh();
      toast(category.archived ? "Categoría restaurada" : "Categoría archivada");
      onClose();
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={category ? "Editar categoría" : `Nueva categoría de ${kind === "income" ? "ingreso" : "gasto"}`}
      footer={
        <div className="flex justify-between">
          {category ? (
            <Button variant="ghost" onClick={toggleArchive} disabled={busy}>
              {category.archived ? "Restaurar" : "Archivar"}
            </Button>
          ) : (
            <span />
          )}
          <Button variant="primary" onClick={save} loading={busy}>
            Guardar
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="Nombre" htmlFor="c-name" error={err ?? undefined} hint={category ? "Archivar la oculta de los formularios sin borrar su historial." : undefined}>
          <Input id="c-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-muted">Color</legend>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setColor(s)}
                aria-label={`Color ${s}`}
                aria-pressed={color === s}
                className={cx("size-8 rounded-full ring-offset-2 ring-offset-surface", color === s && "ring-2 ring-ink")}
                style={{ background: s }}
              />
            ))}
          </div>
        </fieldset>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}

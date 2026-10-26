import Link from "next/link";
import { LandingConverter } from "@/components/landing-converter";
import { Logo } from "@/components/ui";

const FEATURES = [
  {
    title: "Cada cuenta en su moneda",
    body: "Tu cuenta en dólares sigue en dólares y tu Nequi en pesos. Caudal suma todo a tu moneda principal con la tasa del día, sin que conviertas a mano.",
  },
  {
    title: "Transferencias con la tasa real",
    body: "Cuando pasas dólares a pesos registras lo que salió y lo que llegó. Así ves cuánto te costó el cambio, no lo que dijo Google.",
  },
  {
    title: "Presupuestos que avisan a tiempo",
    body: "Ponle tope a mercado o restaurantes. Si a mitad de mes ya vas por el 80%, lo ves antes de que se acabe el mes, no después.",
  },
  {
    title: "Pagos fijos en un toque",
    body: "Arriendo, servicios, suscripciones y salario quedan programados. Cuando llegan, los registras con un botón.",
  },
  {
    title: "Metas con fecha",
    body: "Fondo de emergencia, viaje, cuota inicial. Define cuánto y para cuándo, y Caudal te dice cuánto apartar cada mes.",
  },
  {
    title: "En el computador y en el celular",
    body: "La misma cuenta en la web y en la app. Registra el gasto apenas pagas y revisa el mes con calma en la pantalla grande.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-10">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/entrar" className="rounded-[10px] px-4 py-2 text-[15px] font-medium text-muted hover:text-ink">
            Entrar
          </Link>
          <Link href="/registro" className="rounded-[10px] bg-ink px-4 py-2 text-[15px] font-medium text-bg hover:opacity-90">
            Crear cuenta
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-20 pt-10 md:grid-cols-[1.2fr_1fr] md:px-10 md:pt-20">
          <div>
            <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl xl:text-7xl">
              Ganas en dólares.
              <br />
              Gastas en pesos.
              <br />
              <span className="text-muted">Sabes cuánto tienes.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted">
              Caudal lleva tus cuentas, gastos, presupuestos y metas en la moneda de cada una, y te muestra el total real con la tasa de hoy.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registro" className="inline-flex h-12 items-center rounded-[10px] bg-mango px-6 text-base font-medium text-mango-ink hover:brightness-95">
                Empezar gratis
              </Link>
              <Link href="/entrar" className="inline-flex h-12 items-center rounded-[10px] border border-line bg-surface px-6 text-base font-medium hover:bg-surface-alt">
                Ya tengo cuenta
              </Link>
            </div>
          </div>
          <LandingConverter />
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 md:px-10">
            <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Hecha para quien cobra en una moneda y vive en otra.
            </h2>
            <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="border-t-2 border-ink pt-4">
                  <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-20 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <p className="max-w-xl font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Tus datos son tuyos. Nadie más los ve, no conectamos tu banco y puedes exportarlo todo cuando quieras.
            </p>
            <Link href="/registro" className="inline-flex h-12 items-center rounded-[10px] bg-ink px-6 text-base font-medium text-bg hover:opacity-90">
              Crear mi cuenta
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted md:px-10">
          <Logo className="text-base" />
          <p>Tasas de cambio de open.er-api.com, actualizadas cada 6 horas.</p>
        </div>
      </footer>
    </div>
  );
}

# Caudal

Finanzas personales para quien cobra en una moneda y gasta en otra. Cuentas en su propia moneda, transferencias con la tasa real, presupuestos, metas y pagos recurrentes, con el patrimonio total convertido a tu moneda principal con la tasa del día.

## Estructura

```
apps/
  web/        Next.js 16 (App Router) — landing, auth y la app completa
  mobile/     Expo SDK 58 + Expo Router — app iOS/Android
packages/
  shared/     Tipos, cálculos (resúmenes, presupuestos, metas, patrimonio),
              formato de dinero, validación, acceso a datos y tokens de diseño
supabase/
  migrations/ Esquema Postgres, RLS, triggers y cron de tasas
  functions/  fx-sync: actualiza las tasas de cambio (open.er-api.com)
```

Web y móvil comparten toda la lógica de negocio a través de `@caudal/shared`, así que un cálculo se corrige una sola vez.

## Backend (Supabase)

- **Tablas:** `profiles`, `accounts`, `categories`, `transactions`, `budgets`, `goals`, `recurring`, `fx_rates`.
- **Seguridad:** RLS en todas las tablas; cada usuario solo ve y escribe sus filas. Un trigger valida que cuentas y categorías referenciadas pertenezcan al mismo usuario.
- **Saldos:** la vista `account_balances` (security invoker) calcula el saldo de cada cuenta.
- **Alta de usuario:** un trigger crea el perfil, 15 categorías por defecto y una cuenta de efectivo.
- **Recurrentes:** `post_recurring(id)` crea el movimiento y avanza la próxima fecha.
- **Tasas:** `pg_cron` llama a la función `fx-sync` cada 6 horas.

## Desarrollo

Requisitos: Node 20.9+ y pnpm 10.

```bash
pnpm install
pnpm test          # pruebas de la lógica compartida
pnpm dev:web       # http://localhost:3000
pnpm dev:mobile    # Expo; abre con Expo Go o un dev build
```

Variables de entorno (las llaves son publicables, ya vienen en los `.env.example`):

- `apps/web/.env.local` → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `apps/mobile/.env` → `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

## Despliegue

- **Web:** Vercel, con *Root Directory* `apps/web`. Define las dos variables `NEXT_PUBLIC_*`.
- **Base de datos:** las migraciones de `supabase/migrations` ya están aplicadas al proyecto `caudal`. Para otro proyecto: `supabase db push`.
- **Móvil:** `npx eas-cli@latest build -p android` / `-p ios` desde `apps/mobile`.

### Ajuste pendiente en Supabase Auth

En *Authentication → URL Configuration* pon como **Site URL** el dominio de producción de la web y agrega `https://<dominio>/auth/callback` a **Redirect URLs**, para que los enlaces de confirmación y recuperación lleguen a la app.

-- Caudal: esquema inicial
-- Finanzas personales multimoneda con RLS por usuario.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.account_kind as enum ('cash', 'checking', 'savings', 'credit_card', 'investment', 'wallet');
create type public.category_kind as enum ('income', 'expense');
create type public.transaction_kind as enum ('income', 'expense', 'transfer');
create type public.recurrence as enum ('weekly', 'biweekly', 'monthly', 'yearly');

create domain public.currency_code as text
  check (value in ('COP', 'USD', 'EUR', 'MXN', 'PEN', 'CLP', 'ARS', 'BRL', 'GBP', 'CAD'));

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  base_currency public.currency_code not null default 'COP',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Cuentas
-- ---------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind public.account_kind not null default 'checking',
  currency public.currency_code not null,
  opening_balance numeric(18, 2) not null default 0,
  color text not null default '#3D5AFE' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index accounts_user_idx on public.accounts (user_id);

-- ---------------------------------------------------------------------------
-- Categorías
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  kind public.category_kind not null,
  color text not null default '#8A94A6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default 'tag',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, kind, name)
);
create index categories_user_idx on public.categories (user_id);

-- ---------------------------------------------------------------------------
-- Movimientos
-- amount siempre positivo y en la moneda de account_id.
-- En transferencias, transfer_amount está en la moneda de transfer_account_id.
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.transaction_kind not null,
  account_id uuid not null references public.accounts (id) on delete cascade,
  amount numeric(18, 2) not null check (amount > 0),
  category_id uuid references public.categories (id) on delete set null,
  transfer_account_id uuid references public.accounts (id) on delete cascade,
  transfer_amount numeric(18, 2) check (transfer_amount is null or transfer_amount > 0),
  occurred_on date not null default current_date,
  note text check (note is null or char_length(note) <= 280),
  recurring_id uuid,
  created_at timestamptz not null default now(),
  constraint transfer_shape check (
    (kind = 'transfer' and transfer_account_id is not null and transfer_amount is not null
      and transfer_account_id <> account_id and category_id is null)
    or (kind <> 'transfer' and transfer_account_id is null and transfer_amount is null)
  )
);
create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_transfer_account_idx on public.transactions (transfer_account_id);
create index transactions_category_idx on public.transactions (category_id);

-- ---------------------------------------------------------------------------
-- Presupuestos mensuales por categoría de gasto
-- ---------------------------------------------------------------------------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  amount numeric(18, 2) not null check (amount > 0),
  currency public.currency_code not null,
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);
create index budgets_category_idx on public.budgets (category_id);

-- ---------------------------------------------------------------------------
-- Metas de ahorro
-- ---------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  target_amount numeric(18, 2) not null check (target_amount > 0),
  saved_amount numeric(18, 2) not null default 0 check (saved_amount >= 0),
  currency public.currency_code not null,
  target_date date,
  color text not null default '#2F8F5B' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index goals_user_idx on public.goals (user_id);

-- ---------------------------------------------------------------------------
-- Pagos recurrentes (arriendo, suscripciones, salario)
-- ---------------------------------------------------------------------------
create table public.recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind public.category_kind not null,
  account_id uuid not null references public.accounts (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  amount numeric(18, 2) not null check (amount > 0),
  cadence public.recurrence not null default 'monthly',
  next_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index recurring_user_idx on public.recurring (user_id, next_date);
create index recurring_account_idx on public.recurring (account_id);
create index recurring_category_idx on public.recurring (category_id);

alter table public.transactions
  add constraint transactions_recurring_fk foreign key (recurring_id) references public.recurring (id) on delete set null;
create index transactions_recurring_idx on public.transactions (recurring_id);

-- ---------------------------------------------------------------------------
-- Tasas de cambio (relativas a USD). Solo lectura para usuarios.
-- ---------------------------------------------------------------------------
create table public.fx_rates (
  quote public.currency_code primary key,
  per_usd numeric(20, 8) not null check (per_usd > 0),
  fetched_at timestamptz not null default now()
);

insert into public.fx_rates (quote, per_usd, fetched_at) values
  ('USD', 1, now() - interval '2 days'),
  ('COP', 4000, now() - interval '2 days'),
  ('EUR', 0.92, now() - interval '2 days'),
  ('MXN', 18.5, now() - interval '2 days'),
  ('PEN', 3.75, now() - interval '2 days'),
  ('CLP', 940, now() - interval '2 days'),
  ('ARS', 1000, now() - interval '2 days'),
  ('BRL', 5.4, now() - interval '2 days'),
  ('GBP', 0.79, now() - interval '2 days'),
  ('CAD', 1.37, now() - interval '2 days');

-- ---------------------------------------------------------------------------
-- Integridad: las referencias deben pertenecer al mismo usuario.
-- ---------------------------------------------------------------------------
create or replace function public.assert_owned_refs()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_table_name = 'transactions' then
    if not exists (select 1 from public.accounts a where a.id = new.account_id and a.user_id = new.user_id) then
      raise exception 'Cuenta no válida';
    end if;
    if new.transfer_account_id is not null and not exists (
      select 1 from public.accounts a where a.id = new.transfer_account_id and a.user_id = new.user_id) then
      raise exception 'Cuenta de destino no válida';
    end if;
    if new.category_id is not null and not exists (
      select 1 from public.categories c
      where c.id = new.category_id and c.user_id = new.user_id and c.kind::text = new.kind::text) then
      raise exception 'Categoría no válida para este movimiento';
    end if;
  elsif tg_table_name = 'budgets' then
    if not exists (select 1 from public.categories c
      where c.id = new.category_id and c.user_id = new.user_id and c.kind = 'expense') then
      raise exception 'Los presupuestos solo aplican a categorías de gasto';
    end if;
  elsif tg_table_name = 'recurring' then
    if not exists (select 1 from public.accounts a where a.id = new.account_id and a.user_id = new.user_id) then
      raise exception 'Cuenta no válida';
    end if;
    if new.category_id is not null and not exists (
      select 1 from public.categories c
      where c.id = new.category_id and c.user_id = new.user_id and c.kind = new.kind) then
      raise exception 'Categoría no válida';
    end if;
  end if;
  return new;
end;
$$;

create trigger transactions_owned before insert or update on public.transactions
  for each row execute function public.assert_owned_refs();
create trigger budgets_owned before insert or update on public.budgets
  for each row execute function public.assert_owned_refs();
create trigger recurring_owned before insert or update on public.recurring
  for each row execute function public.assert_owned_refs();

-- ---------------------------------------------------------------------------
-- Saldos por cuenta
-- ---------------------------------------------------------------------------
create or replace view public.account_balances
with (security_invoker = true)
as
select
  a.id as account_id,
  a.user_id,
  a.currency,
  a.opening_balance
    + coalesce((select sum(t.amount) from public.transactions t where t.account_id = a.id and t.kind = 'income'), 0)
    - coalesce((select sum(t.amount) from public.transactions t where t.account_id = a.id and t.kind in ('expense', 'transfer')), 0)
    + coalesce((select sum(t.transfer_amount) from public.transactions t where t.transfer_account_id = a.id and t.kind = 'transfer'), 0)
    as balance
from public.accounts a;

-- ---------------------------------------------------------------------------
-- Registrar un pago recurrente: crea el movimiento y avanza la fecha.
-- ---------------------------------------------------------------------------
create or replace function public.post_recurring(p_id uuid)
returns public.transactions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r public.recurring;
  t public.transactions;
begin
  select * into r from public.recurring where id = p_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Pago recurrente no encontrado';
  end if;

  insert into public.transactions (user_id, kind, account_id, amount, category_id, occurred_on, note, recurring_id)
  values (r.user_id, r.kind::text::public.transaction_kind, r.account_id, r.amount, r.category_id, r.next_date, r.name, r.id)
  returning * into t;

  update public.recurring
  set next_date = case r.cadence
      when 'weekly' then r.next_date + 7
      when 'biweekly' then r.next_date + 14
      when 'monthly' then (r.next_date + interval '1 month')::date
      when 'yearly' then (r.next_date + interval '1 year')::date
    end
  where id = r.id;

  return t;
end;
$$;

-- ---------------------------------------------------------------------------
-- Alta de usuario: perfil, categorías por defecto y una cuenta de efectivo.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));

  insert into public.categories (user_id, name, kind, color, icon) values
    (new.id, 'Salario', 'income', '#2F8F5B', 'briefcase'),
    (new.id, 'Freelance', 'income', '#3C9D8F', 'laptop'),
    (new.id, 'Inversiones', 'income', '#5B7FDB', 'trending-up'),
    (new.id, 'Otros ingresos', 'income', '#8A94A6', 'plus'),
    (new.id, 'Vivienda', 'expense', '#C8463D', 'home'),
    (new.id, 'Mercado', 'expense', '#E08A2E', 'shopping-cart'),
    (new.id, 'Restaurantes', 'expense', '#D9653B', 'utensils'),
    (new.id, 'Transporte', 'expense', '#3D5AFE', 'bus'),
    (new.id, 'Servicios', 'expense', '#6C5CE7', 'zap'),
    (new.id, 'Salud', 'expense', '#D6457A', 'heart'),
    (new.id, 'Educación', 'expense', '#1F8AC0', 'book'),
    (new.id, 'Suscripciones', 'expense', '#8E5BD9', 'repeat'),
    (new.id, 'Ocio', 'expense', '#F2A541', 'music'),
    (new.id, 'Impuestos', 'expense', '#5E6A7D', 'landmark'),
    (new.id, 'Otros gastos', 'expense', '#8A94A6', 'tag');

  insert into public.accounts (user_id, name, kind, currency, color)
  values (new.id, 'Efectivo', 'cash', 'COP', '#2F8F5B');

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.recurring enable row level security;
alter table public.fx_rates enable row level security;

create policy "perfil propio: leer" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "perfil propio: editar" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

do $$
declare
  t text;
begin
  foreach t in array array['accounts', 'categories', 'transactions', 'budgets', 'goals', 'recurring'] loop
    execute format('create policy "propios: leer" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "propios: crear" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "propios: editar" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "propios: borrar" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

create policy "tasas: leer" on public.fx_rates for select to authenticated, anon using (true);

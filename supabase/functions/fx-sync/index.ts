// Actualiza public.fx_rates con tasas frente a USD desde open.er-api.com.
// Es idempotente y se limita a una actualización por hora, así que puede
// llamarse sin autenticación (desde pg_cron o desde las apps).
import { createClient } from 'npm:@supabase/supabase-js@2';

const CURRENCIES = ['USD', 'COP', 'EUR', 'MXN', 'PEN', 'CLP', 'ARS', 'BRL', 'GBP', 'CAD'];
const MIN_AGE_MS = 60 * 60 * 1000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: latest } = await supabase
    .from('fx_rates')
    .select('fetched_at')
    .eq('quote', 'COP')
    .maybeSingle();

  if (latest && Date.now() - new Date(latest.fetched_at).getTime() < MIN_AGE_MS) {
    return json({ updated: false, reason: 'fresh', fetched_at: latest.fetched_at });
  }

  const res = await fetch('https://open.er-api.com/v6/latest/USD');
  if (!res.ok) return json({ updated: false, error: `Proveedor respondió ${res.status}` }, 502);
  const body = await res.json();
  if (body.result !== 'success' || !body.rates) return json({ updated: false, error: 'Respuesta inválida' }, 502);

  const fetched_at = new Date().toISOString();
  const rows = CURRENCIES.filter((c) => typeof body.rates[c] === 'number' && body.rates[c] > 0).map((c) => ({
    quote: c,
    per_usd: c === 'USD' ? 1 : body.rates[c],
    fetched_at,
  }));

  const { error } = await supabase.from('fx_rates').upsert(rows, { onConflict: 'quote' });
  if (error) return json({ updated: false, error: error.message }, 500);

  return json({ updated: true, fetched_at, count: rows.length });
});

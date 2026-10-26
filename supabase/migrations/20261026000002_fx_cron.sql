-- Refresca las tasas de cambio cada 6 horas llamando a la función fx-sync.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'fx-sync',
  '7 */6 * * *',
  $$ select net.http_post(
       url := 'https://zhjttjbyzftjjrtrmqxv.supabase.co/functions/v1/fx-sync',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb
     ); $$
);

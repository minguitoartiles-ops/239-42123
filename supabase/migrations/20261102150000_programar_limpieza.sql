-- =====================================================================
-- Fitnessindramas · programa la limpieza de archivos y cuentas
--
-- Cada día a las 04:30 (después de la tarea diaria de las 04:00) la base de datos llama
-- a la función limpieza-diaria. Necesita dos secretos guardados en Vault (cifrados), que
-- se crean una sola vez desde el panel de Supabase y nunca van en el código:
--   url_proyecto    https://<ref>.supabase.co
--   token_limpieza  la misma llave que el secreto LIMPIEZA_TOKEN de las Edge Functions
-- Mientras no existan, la tarea no hace nada.
-- =====================================================================

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
    perform cron.schedule('limpieza-diaria', '30 4 * * *', $tarea$
      select net.http_post(
        url     := (select decrypted_secret from vault.decrypted_secrets where name = 'url_proyecto')
                   || '/functions/v1/limpieza-diaria',
        headers := jsonb_build_object(
                     'Content-Type', 'application/json',
                     'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'token_limpieza')),
        body    := '{}'::jsonb)
      where exists (select 1 from vault.decrypted_secrets where name = 'url_proyecto')
        and exists (select 1 from vault.decrypted_secrets where name = 'token_limpieza')
    $tarea$);
  end if;
end $$;

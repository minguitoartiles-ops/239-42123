-- La tabla de salud avisa en tiempo real y sus permisos no cambian (sigue con RLS y sin acceso anónimo)
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);
select ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'salud'),
  'salud está en el tiempo real');
select ok((select relrowsecurity from pg_class where oid = 'public.salud'::regclass), 'salud sigue con RLS');
select ok(not has_table_privilege('anon', 'public.salud', 'select'), 'anónimo no puede leer salud');
select ok(not has_table_privilege('authenticated', 'public.salud', 'delete'), 'nadie borra salud desde la app');
select * from finish();
rollback;

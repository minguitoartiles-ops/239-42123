-- 8/11/2026 · El cuestionario inicial y las alergias (tabla public.salud) avisan en tiempo real.
-- Antes, si un cliente lo enviaba con el ordenador del equipo abierto, no se veía hasta recargar.
-- El tiempo real respeta las mismas políticas RLS de lectura: cada cliente recibe solo lo suyo y el equipo, lo de todos.
-- Solo se añade la tabla a la publicación; no cambia ningún permiso.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'salud') then
    alter publication supabase_realtime add table public.salud;
  end if;
end $$;

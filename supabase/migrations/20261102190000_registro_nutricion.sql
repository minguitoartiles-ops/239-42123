-- =====================================================================
-- Fitnessindramas · lo que marca el cliente en su plan de nutrición (comidas tomadas y
-- alimentos elegidos), por semanas, igual que el registro de entreno. Lo escribe solo el
-- cliente; el equipo lo lee. La pauta (planes_nutricion) la sigue escribiendo solo la dietista.
-- =====================================================================

create table public.registro_nutricion (
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  semana      text not null check (semana ~ '^[0-9]{4}-W[0-9]{2}$'),   -- semana ISO: 2026-W45
  datos       jsonb not null default '{}'::jsonb
              check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) <= 131072),
  actualizado timestamptz not null default now(),
  primary key (cliente_id, semana)
);

create trigger sellar       before insert or update on public.registro_nutricion for each row execute function privado.sellar();
create trigger cliente_fijo before update on public.registro_nutricion for each row execute function privado.cliente_fijo();

alter table public.registro_nutricion enable row level security;

revoke all on public.registro_nutricion from public, anon, authenticated;
grant select, insert (cliente_id, semana, datos), update (cliente_id, semana, datos)
  on public.registro_nutricion to authenticated;
grant all on public.registro_nutricion to service_role;

create policy "registro nutrición: lee el equipo o su cliente" on public.registro_nutricion for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente()));
create policy "registro nutrición: crea su cliente" on public.registro_nutricion for insert to authenticated
  with check (cliente_id = (select privado.mi_cliente()));
create policy "registro nutrición: edita su cliente" on public.registro_nutricion for update to authenticated
  using (cliente_id = (select privado.mi_cliente())) with check (cliente_id = (select privado.mi_cliente()));

-- Tiempo real (respeta las mismas políticas)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.registro_nutricion;
  end if;
end $$;

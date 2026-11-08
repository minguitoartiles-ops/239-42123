-- =====================================================================
-- Fitnessindramas · plantillas de rutinas y dietas en el servidor (8/11/2026)
--
-- Hasta ahora las plantillas propias de Domingo (entrenamiento) y de Fátima (nutrición) solo estaban
-- en el aparato donde se guardaron. Pasan a esta tabla:
--   · Cada profesional ve y gestiona SOLO las suyas (privadas); un cliente no ve ninguna.
--   · Domingo (entrenador) solo guarda de entrenamiento y Fátima (dietista) solo de nutrición: lo
--     decide el servidor, no la pantalla.
--   · Nada se borra desde la app: «borrar» la archiva (archivada = true) y deja de salir en su lista.
--   · «contenido» es lo que la app guarda de la plantilla (texto del plan, objetivos…); tope de 200 KB.
-- =====================================================================

create table public.plantillas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  area        text not null check (area in ('entreno', 'nutricion')),
  nombre      text not null check (char_length(nombre) between 1 and 80),
  contenido   jsonb not null check (pg_column_size(contenido) < 200000),
  archivada   boolean not null default false,
  actualizada timestamptz not null default now(),
  unique (user_id, area, nombre)
);

create function privado.preparar_plantilla() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  v_rol text;
begin
  if auth.uid() is null then
    return new;                                  -- el servidor (pruebas) pone lo que quiera
  end if;
  v_rol := (select privado.mi_rol());
  if v_rol is null then
    raise exception 'Solo el equipo guarda plantillas' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    if new.area is distinct from (case v_rol when 'entrenador' then 'entreno' else 'nutricion' end) then
      raise exception 'Cada profesional guarda las plantillas de su área' using errcode = '42501';
    end if;
  end if;
  new.actualizada := now();
  return new;
end $$;
revoke all on function privado.preparar_plantilla() from public, anon, authenticated;
create trigger preparar before insert or update on public.plantillas
  for each row execute function privado.preparar_plantilla();

alter table public.plantillas enable row level security;
revoke all on public.plantillas from public, anon, authenticated;
-- sin DELETE: archivar es cambiar «archivada»; el nombre y el área no se cambian una vez creada
grant select, insert (area, nombre, contenido), update (contenido, archivada) on public.plantillas to authenticated;
grant all on public.plantillas to service_role;

create policy "plantillas: las mías" on public.plantillas for select to authenticated
  using (user_id = (select auth.uid()) and (select privado.es_equipo()));
create policy "plantillas: las creo yo" on public.plantillas for insert to authenticated
  with check (user_id = (select auth.uid()) and (select privado.es_equipo()));
create policy "plantillas: cambio las mías" on public.plantillas for update to authenticated
  using (user_id = (select auth.uid()) and (select privado.es_equipo()))
  with check (user_id = (select auth.uid()) and (select privado.es_equipo()));

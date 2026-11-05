-- =====================================================================
-- Fitnessindramas · paso 5: seguimientos semanales desde el servidor
--
--   1. Seguimientos: uno por cliente y semana (lunes a domingo). El cliente lo envía y solo
--      puede corregir el de la semana en curso. El equipo no cambia lo que escribió.
--   2. Lo que hace cada profesional con cada seguimiento (visto, revisado y su comentario),
--      por separado: lo que revisa Domingo no se le quita a Fátima. Si el cliente corrige el
--      seguimiento después, esa revisión deja de contar (la app lo compara con «editado»).
--      Solo lo ve el equipo.
--   3. Historial del cliente (registro de pesos por semana, tonelaje, sesiones, comidas y
--      cardio): lo escribe solo su móvil; el equipo lo lee.
--
-- La revisión única antigua (seguimientos.revisado / nota_equipo) ya no se usa: se retira el
-- permiso para cambiarla. Nada se borra con DELETE desde la app.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · Seguimientos: semana, «editado» y reglas
-- ---------------------------------------------------------------------
alter table public.seguimientos
  add column semana  text check (semana ~ '^[0-9]{4}-W[0-9]{2}$'),
  add column editado timestamptz;
update public.seguimientos s set semana = to_char(s.fecha, 'IYYY-"W"IW') where s.semana is null;
-- si había dos de la misma semana (solo con datos de prueba anteriores a esta regla), se queda
-- el primero que se envió
delete from public.seguimientos a using public.seguimientos b
 where a.cliente_id = b.cliente_id and a.semana = b.semana and (a.creado, a.id) > (b.creado, b.id);
alter table public.seguimientos alter column semana set not null;
create unique index seguimientos_una_por_semana on public.seguimientos (cliente_id, semana);

-- La semana de un día (formato ISO: 2026-W45)
create function privado.semana_de(d date) returns text
  language sql immutable set search_path = ''
as $$ select to_char(d, 'IYYY-"W"IW') $$;

-- ¿Es la semana en curso? Con un día de margen a cada lado: el lunes llega antes a Canarias o a
-- América que al servidor (que va en hora universal), y la app cuenta la semana con la hora del móvil.
create function privado.semana_en_curso(s text) returns boolean
  language sql stable set search_path = ''
as $$ select s in (privado.semana_de(current_date - 1), privado.semana_de(current_date), privado.semana_de(current_date + 1)) $$;

create or replace function privado.proteger_seguimiento() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is null then          -- servidor
    new.semana := privado.semana_de(new.fecha);
    return new;
  end if;
  if tg_op = 'INSERT' then
    -- la fecha la manda el móvil (su día); si no cuadra con hoy, cuenta la del servidor
    if new.fecha is null or new.fecha not between current_date - 1 and current_date + 1 then
      new.fecha := current_date;
    end if;
    new.semana := privado.semana_de(new.fecha);
    new.revisado := false;
    new.revisado_por := null;
    new.nota_equipo := null;
    new.editado := null;
    new.creado := now();
    new.actualizado := now();
    return new;
  end if;
  if privado.es_equipo() then
    if new.datos is distinct from old.datos or new.fecha is distinct from old.fecha then
      raise exception 'El equipo no cambia lo que escribió el cliente' using errcode = '42501';
    end if;
  else
    if not privado.semana_en_curso(old.semana) then
      raise exception 'Solo se puede corregir el seguimiento de esta semana' using errcode = '42501';
    end if;
    if new.fecha is distinct from old.fecha or new.revisado is distinct from old.revisado
       or new.nota_equipo is distinct from old.nota_equipo then
      raise exception 'Solo se puede corregir lo que se escribió' using errcode = '42501';
    end if;
    if new.datos is distinct from old.datos then
      new.editado := now();           -- las revisiones anteriores dejan de contar
    end if;
  end if;
  new.semana := old.semana;
  new.creado := old.creado;
  new.actualizado := now();
  return new;
end $$;

-- Permisos: el cliente envía (con su día) y corrige lo que escribió; la revisión va aparte
revoke insert, update on public.seguimientos from authenticated;
grant insert (id, cliente_id, fecha, datos), update (datos) on public.seguimientos to authenticated;

-- Corregir: solo el cliente (el equipo no tiene nada que cambiar aquí)
drop policy "seguimientos: edita el equipo o su cliente" on public.seguimientos;
create policy "seguimientos: corrige su cliente" on public.seguimientos for update to authenticated
  using (cliente_id = (select privado.mi_cliente()))
  with check (cliente_id = (select privado.mi_cliente()));

-- ---------------------------------------------------------------------
-- 2 · Lo que hace cada profesional con cada seguimiento (solo el equipo)
-- ---------------------------------------------------------------------
create table public.seguimiento_equipo (
  id              uuid primary key default gen_random_uuid(),
  seguimiento_id  uuid not null references public.seguimientos (id) on delete cascade,
  cliente_id      uuid not null references public.clientes (id) on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  visto           timestamptz,
  revisado        timestamptz,
  comentario      text check (char_length(comentario) <= 4000),
  unique (seguimiento_id, user_id)
);
create index seguimiento_equipo_cliente on public.seguimiento_equipo (cliente_id);

create function privado.preparar_seg_equipo() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.seguimiento_id is distinct from old.seguimiento_id then
    raise exception 'No se puede cambiar de seguimiento' using errcode = '42501';
  end if;
  new.user_id := auth.uid();
  select s.cliente_id into new.cliente_id from public.seguimientos s where s.id = new.seguimiento_id;
  if new.cliente_id is null then
    raise exception 'Ese seguimiento no existe' using errcode = '23514';
  end if;
  -- «visto»: con la hora del servidor cada vez que se marca (tras una corrección vuelve a marcarse);
  -- no se puede quitar
  new.visto := case when new.visto is null then (case when tg_op = 'UPDATE' then old.visto end)
                    when tg_op = 'INSERT' or old.visto is null or new.visto is distinct from old.visto then now()
                    else old.visto end;
  -- «revisado»: cada vez que se completa, con la hora del servidor; sin él, sin comentario
  if new.revisado is null then
    new.comentario := null;
  elsif tg_op = 'INSERT' or old.revisado is null or new.revisado is distinct from old.revisado then
    new.revisado := now();
    new.visto := coalesce(new.visto, now());
  end if;
  return new;
end $$;
revoke all on function privado.preparar_seg_equipo() from public, anon, authenticated;

create trigger preparar before insert or update on public.seguimiento_equipo
  for each row execute function privado.preparar_seg_equipo();

alter table public.seguimiento_equipo enable row level security;
revoke all on public.seguimiento_equipo from public, anon, authenticated;
-- update de seguimiento_id: lo pide el «upsert» de la API; el trigger impide cambiarlo
grant select, insert (seguimiento_id, visto, revisado, comentario),
              update (seguimiento_id, visto, revisado, comentario) on public.seguimiento_equipo to authenticated;
grant all on public.seguimiento_equipo to service_role;

create policy "seguimiento equipo: lo ve el equipo" on public.seguimiento_equipo for select to authenticated
  using ((select privado.es_equipo()));
create policy "seguimiento equipo: cada uno apunta lo suyo" on public.seguimiento_equipo for insert to authenticated
  with check ((select privado.es_equipo()) and user_id = (select auth.uid()));
create policy "seguimiento equipo: cada uno cambia lo suyo" on public.seguimiento_equipo for update to authenticated
  using ((select privado.es_equipo()) and user_id = (select auth.uid()))
  with check ((select privado.es_equipo()) and user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 3 · Historial del cliente (lo escribe su móvil; el equipo lo lee)
-- ---------------------------------------------------------------------
create table public.historial (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null unique references public.clientes (id) on delete cascade,
  datos       jsonb not null default '{}'::jsonb
              check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) <= 262144),
  actualizado timestamptz not null default now()
);

create trigger sellar       before insert or update on public.historial for each row execute function privado.sellar();
create trigger cliente_fijo before update on public.historial for each row execute function privado.cliente_fijo();

alter table public.historial enable row level security;
revoke all on public.historial from public, anon, authenticated;
grant select, insert (cliente_id, datos), update (cliente_id, datos) on public.historial to authenticated;
grant all on public.historial to service_role;

create policy "historial: lo ven el equipo y su cliente" on public.historial for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente()));
create policy "historial: lo crea su cliente" on public.historial for insert to authenticated
  with check (cliente_id = (select privado.mi_cliente()));
create policy "historial: lo cambia su cliente" on public.historial for update to authenticated
  using (cliente_id = (select privado.mi_cliente()))
  with check (cliente_id = (select privado.mi_cliente()));

-- ---------------------------------------------------------------------
-- 4 · Tiempo real (respeta las mismas políticas)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.seguimiento_equipo, public.historial;
  end if;
end $$;

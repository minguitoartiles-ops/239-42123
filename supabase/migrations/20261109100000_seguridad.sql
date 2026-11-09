-- =====================================================================
-- Fitnessindramas · auditoría de seguridad del 9/11/2026
--
--   1. Cuestionario y alergias (public.salud): el servidor solo acepta la forma que guarda la
--      app. Lo escribe el cliente y alguien podría mandarlo directo a la API, saltándose la app:
--      con una marca de alergia inventada se podía colar código en la pantalla del equipo.
--   2. Pagos: la nota interna, el motivo de anulación y quién lo registró o anuló dejan de verlos
--      los clientes. El equipo los lee con public.pagos_internos().
--   3. pg_net (la extensión con la que la base de datos llama a la limpieza diaria) pasa del
--      esquema public al de extensiones, como pide Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · Forma de public.salud
-- ---------------------------------------------------------------------
create or replace function privado.salud_valida(d jsonb) returns boolean
  language sql immutable set search_path = ''
as $$
  select jsonb_typeof(d) = 'object'
    -- solo las claves que guarda la app
    and not exists (select 1 from jsonb_object_keys(d) k
                     where k not in ('cuestionario', 'medIni', 'alergias', 'dni', 'nombreFiscal', 'dirFiscal'))
    and (d -> 'cuestionario' is null or jsonb_typeof(d -> 'cuestionario') = 'object')
    and (d #> '{cuestionario,r}' is null or jsonb_typeof(d #> '{cuestionario,r}') = 'object')
    and (d -> 'medIni' is null or jsonb_typeof(d -> 'medIni') = 'object')
    and (d -> 'alergias' is null or jsonb_typeof(d -> 'alergias') = 'object')
    and (d #> '{alergias,items}' is null or (
          jsonb_typeof(d #> '{alergias,items}') = 'object'
          -- cada alergia: un nombre corto y una de las tres marcas
          and not exists (select 1 from jsonb_each(d #> '{alergias,items}') e
                           where e.key !~ '^[A-Za-z0-9_-]{1,40}$'
                              or jsonb_typeof(e.value) <> 'string'
                              or e.value #>> '{}' not in ('diag', 'sosp', ''))))
    and (d #> '{alergias,gastro}' is null or jsonb_typeof(d #> '{alergias,gastro}') = 'object')
    and (d #> '{alergias,gastro,items}' is null or (
          jsonb_typeof(d #> '{alergias,gastro,items}') = 'array'
          and not exists (select 1 from jsonb_array_elements(d #> '{alergias,gastro,items}') x
                           where jsonb_typeof(x) <> 'string' or x #>> '{}' !~ '^[A-Za-z0-9_-]{1,40}$')))
    and (d -> 'dni' is null or (jsonb_typeof(d -> 'dni') = 'string' and char_length(d ->> 'dni') <= 20))
    and (d -> 'nombreFiscal' is null or (jsonb_typeof(d -> 'nombreFiscal') = 'string' and char_length(d ->> 'nombreFiscal') <= 120))
    and (d -> 'dirFiscal' is null or (jsonb_typeof(d -> 'dirFiscal') = 'string' and char_length(d ->> 'dirFiscal') <= 200))
$$;

-- la regla la comprueba quien escribe (el cliente): necesita poder usar la función
grant execute on function privado.salud_valida(jsonb) to authenticated, service_role;
alter table public.salud add constraint salud_forma check (privado.salud_valida(datos));

-- ---------------------------------------------------------------------
-- 2 · Pagos: lo interno, solo para el equipo
-- ---------------------------------------------------------------------
revoke select on public.pagos from authenticated;
grant select (id, cliente_id, fecha, importe, metodo, periodo_desde, periodo_hasta, creado, factura_id, anulado)
  on public.pagos to authenticated;

create function public.pagos_internos(p_ids uuid[] default null)
  returns table (id uuid, nota text, registrado_por uuid, anulado_por uuid, anulado_motivo text)
  language sql stable security definer set search_path = ''
as $$
  select p.id, p.nota, p.registrado_por, p.anulado_por, p.anulado_motivo
    from public.pagos p
   where (select privado.es_equipo())                    -- un cliente recibe la lista vacía
     and (p_ids is null or p.id = any (p_ids))
$$;
revoke execute on function public.pagos_internos(uuid[]) from public, anon;
grant execute on function public.pagos_internos(uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- 3 · pg_net fuera del esquema public (no se puede mover: se quita y se vuelve a poner)
--     La tarea programada «limpieza-diaria» llama a net.http_post por su nombre: sigue igual.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
              where e.extname = 'pg_net' and n.nspname = 'public') then
    drop extension pg_net;
    create extension pg_net with schema extensions;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4 · Límite de escrituras por persona (además de los que ya tenían los mensajes y las subidas)
--     Un cliente que mande cambios sin parar a la API (sin pasar por la app) se para en 1.500 cada
--     10 minutos. La app, guardando sola mientras se escribe, se queda muy por debajo. El equipo y
--     el propio servidor no tienen límite.
-- ---------------------------------------------------------------------
create table privado.escrituras (
  user_id uuid not null,
  ventana timestamptz not null,
  n       integer not null default 0,
  primary key (user_id, ventana)
);
alter table privado.escrituras enable row level security;

create function privado.limitar_escrituras() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  v_yo uuid := auth.uid();
  v_ventana timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  v_n integer;
begin
  if v_yo is null or privado.es_equipo() then
    return new;
  end if;
  insert into privado.escrituras as e (user_id, ventana, n) values (v_yo, v_ventana, 1)
  on conflict (user_id, ventana) do update set n = e.n + 1
  returning n into v_n;
  if v_n = 1 then                                   -- de paso, fuera lo de días anteriores
    delete from privado.escrituras where user_id = v_yo and ventana < now() - interval '1 day';
  end if;
  if v_n > 1500 then
    raise exception 'Demasiados cambios seguidos. Espera unos minutos.' using errcode = '54000';
  end if;
  return new;
end $$;
revoke execute on function privado.limitar_escrituras() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['registro_entreno', 'registro_nutricion', 'historial', 'salud', 'seguimientos',
                           'consentimientos', 'chat_lecturas', 'fotos_perfil'] loop
    execute format('create trigger limitar_escrituras before insert or update on public.%I
                      for each row execute function privado.limitar_escrituras()', t);
  end loop;
end $$;

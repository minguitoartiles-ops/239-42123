-- =====================================================================
-- Fitnessindramas · facturas desde la app (paso 8, decisiones de Domingo del 6/11/2026)
--
--   · Fátima → cliente: una factura por pago, con el 7 % de IGIC incluido en el precio.
--   · Domingo → Fátima: una al mes por el 50 % de lo que pagaron los clientes ese mes (pagos
--     con fecha de ese mes, sin los anulados), exenta de IGIC (franquicia fiscal) y con una
--     retención de IRPF del 15 %. Solo meses ya cerrados y una vez por mes.
--   · Cada uno lleva su numeración (Fátima la suya, Domingo sigue desde la 11): la primera vez
--     se indica el último número hecho fuera de la app, mientras no haya facturas ese año.
--   · Los datos fiscales (nombre, NIF, domicilio) se guardan aquí, los ven solo Domingo y Fátima
--     y cada uno cambia los suyos. Cada factura guarda una copia: no cambia aunque luego cambien.
--   · Las facturas no se cambian ni se borran desde la app.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · Datos fiscales del equipo
-- ---------------------------------------------------------------------
create table public.datos_fiscales (
  user_id     uuid primary key default auth.uid() references public.equipo (user_id) on delete cascade,
  nombre      text not null check (char_length(trim(nombre)) between 2 and 120),
  nif         text not null check (nif ~ '^[A-Z0-9]{8,12}$'),
  direccion   text not null check (char_length(trim(direccion)) between 5 and 200),
  contacto    text check (char_length(contacto) <= 120),
  nota        text check (char_length(nota) <= 200),
  actualizado timestamptz not null default now()
);

create function privado.preparar_datos_fiscales() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  new.nif := upper(regexp_replace(coalesce(new.nif, ''), '[^A-Za-z0-9]', '', 'g'));
  new.nombre := trim(new.nombre);
  new.direccion := trim(new.direccion);
  new.actualizado := now();
  return new;
end $$;
revoke all on function privado.preparar_datos_fiscales() from public, anon, authenticated;
create trigger preparar before insert or update on public.datos_fiscales
  for each row execute function privado.preparar_datos_fiscales();

alter table public.datos_fiscales enable row level security;
revoke all on public.datos_fiscales from public, anon, authenticated;
grant select, insert (user_id, nombre, nif, direccion, contacto, nota), update (user_id, nombre, nif, direccion, contacto, nota)
  on public.datos_fiscales to authenticated;
grant all on public.datos_fiscales to service_role;
create policy "datos fiscales: los ve el equipo" on public.datos_fiscales for select to authenticated
  using ((select privado.es_equipo()));
create policy "datos fiscales: cada uno pone los suyos" on public.datos_fiscales for insert to authenticated
  with check (user_id = (select auth.uid()) and (select privado.es_equipo()));
create policy "datos fiscales: cada uno cambia los suyos" on public.datos_fiscales for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and (select privado.es_equipo()));

-- Copia de los datos fiscales de alguien del equipo para una factura (falla si faltan)
create function privado.ficha_fiscal(p_uid uuid, p_quien text) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
declare
  r public.datos_fiscales%rowtype;
begin
  select * into r from public.datos_fiscales where user_id = p_uid;
  if not found then
    raise exception 'Faltan los datos de facturación de %', p_quien using errcode = '22023';
  end if;
  return jsonb_strip_nulls(jsonb_build_object('nombre', r.nombre, 'nif', r.nif, 'direccion', r.direccion,
                                              'contacto', nullif(r.contacto, ''), 'nota', nullif(r.nota, '')));
end $$;
revoke all on function privado.ficha_fiscal(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2 · Numeración de cada uno
-- ---------------------------------------------------------------------
create function privado.mi_serie() returns text
  language sql stable security definer set search_path = ''
as $$ select case e.rol when 'dietista' then 'F' when 'entrenador' then 'D' end from public.equipo e where e.user_id = auth.uid() $$;
revoke all on function privado.mi_serie() from public, anon;
grant execute on function privado.mi_serie() to authenticated;

-- Cuál será mi próxima factura este año y si todavía se puede fijar el punto de partida
create function public.mi_numeracion() returns table (serie text, anio integer, siguiente integer, se_puede_fijar boolean)
  language sql stable security definer set search_path = ''
as $$
  with s as (select privado.mi_serie() as serie, extract(year from current_date)::integer as anio)
  select s.serie, s.anio,
         coalesce((select c.ultimo from privado.contadores_factura c where c.serie = s.serie and c.anio = s.anio), 0) + 1,
         not exists (select 1 from public.facturas f where f.serie = s.serie and f.anio = s.anio)
    from s where s.serie is not null
$$;
revoke all on function public.mi_numeracion() from public, anon;
grant execute on function public.mi_numeracion() to authenticated;

-- La primera vez: «mi última factura de este año fuera de la app fue la N»
create function public.fijar_numeracion(p_ultimo integer) returns void
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_serie text := privado.mi_serie();
  v_anio  integer := extract(year from current_date)::integer;
begin
  if v_serie is null then
    raise exception 'Solo el equipo lleva numeración de facturas' using errcode = '42501';
  end if;
  if p_ultimo is null or p_ultimo < 0 or p_ultimo > 99999 then
    raise exception 'Número no válido' using errcode = '22023';
  end if;
  if exists (select 1 from public.facturas f where f.serie = v_serie and f.anio = v_anio) then
    raise exception 'Ya hay facturas de este año en la app: la numeración ya no se puede cambiar' using errcode = '22023';
  end if;
  insert into privado.contadores_factura (serie, anio, ultimo) values (v_serie, v_anio, p_ultimo)
  on conflict (serie, anio) do update set ultimo = excluded.ultimo;
end $$;
revoke all on function public.fijar_numeracion(integer) from public, anon;
grant execute on function public.fijar_numeracion(integer) to authenticated;

-- ---------------------------------------------------------------------
-- 3 · Fátima → cliente (IGIC 7 % incluido en el precio)
-- ---------------------------------------------------------------------
create or replace function public.emitir_factura_cliente(p_pagos uuid[], p_receptor jsonb) returns text
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_yo       uuid := auth.uid();
  v_pagos    uuid[];
  v_n        integer;
  v_clientes integer;
  v_cliente  uuid;
  v_total    numeric(10, 2);
  v_base     numeric(10, 2);
  v_lineas   jsonb;
  v_emisor   jsonb;
  v_anio     integer := extract(year from current_date)::integer;
  v_id       uuid;
  v_codigo   text;
begin
  if (select e.rol from public.equipo e where e.user_id = v_yo) is distinct from 'dietista' then
    raise exception 'Solo la dietista emite facturas a clientes' using errcode = '42501';
  end if;
  v_pagos := array(select distinct x from unnest(p_pagos) x where x is not null);
  if cardinality(v_pagos) not between 1 and 50 then
    raise exception 'Indica entre 1 y 50 pagos' using errcode = '22023';
  end if;
  v_emisor := privado.ficha_fiscal(v_yo, 'Fátima');

  perform 1 from public.pagos p where p.id = any (v_pagos) for update;
  select count(*), count(distinct p.cliente_id), min(p.cliente_id::text)::uuid, sum(p.importe),
         jsonb_agg(jsonb_build_object('fecha', p.fecha, 'importe', p.importe, 'metodo', p.metodo,
                                      'desde', p.periodo_desde, 'hasta', p.periodo_hasta) order by p.fecha)
    into v_n, v_clientes, v_cliente, v_total, v_lineas
    from public.pagos p
   where p.id = any (v_pagos) and p.factura_id is null and p.anulado is null;
  if v_n <> cardinality(v_pagos) or v_clientes <> 1 then
    raise exception 'Algún pago no existe, ya está facturado, está anulado o es de otro cliente' using errcode = '22023';
  end if;
  v_base := round(v_total / 1.07, 2);

  insert into public.facturas (emisor, serie, anio, numero, tipo, cliente_id, datos, total)
  values (v_yo, 'F', v_anio, privado.siguiente_numero('F', v_anio), 'cliente', v_cliente,
          jsonb_build_object('emisor', v_emisor, 'receptor', privado.receptor_limpio(p_receptor), 'lineas', v_lineas,
                             'concepto', 'Asesoramiento de entrenamiento y nutrición',
                             'base', v_base, 'impuesto', jsonb_build_object('nombre', 'IGIC 7 %', 'tipo', 7, 'cuota', v_total - v_base)),
          v_total)
  returning id, codigo into v_id, v_codigo;

  update public.pagos set factura_id = v_id where id = any (v_pagos);
  return v_codigo;
end $$;
revoke all on function public.emitir_factura_cliente(uuid[], jsonb) from public, anon;
grant execute on function public.emitir_factura_cliente(uuid[], jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 4 · Domingo → Fátima, una al mes: 50 % de lo pagado, exenta de IGIC, retención 15 %
--     (p_receptor ya no se usa: el receptor son los datos fiscales de Fátima)
-- ---------------------------------------------------------------------
create or replace function public.emitir_factura_mensual(p_mes date, p_receptor jsonb) returns text
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_yo       uuid := auth.uid();
  v_mes      date := date_trunc('month', p_mes)::date;
  v_dietista uuid;
  v_n        integer;
  v_cobrado  numeric(10, 2);
  v_base     numeric(10, 2);
  v_ret      numeric(10, 2);
  v_emisor   jsonb;
  v_receptor jsonb;
  v_anio     integer := extract(year from current_date)::integer;
  v_codigo   text;
begin
  if (select e.rol from public.equipo e where e.user_id = v_yo) is distinct from 'entrenador' then
    raise exception 'Solo el entrenador emite la factura mensual' using errcode = '42501';
  end if;
  if p_mes is null or v_mes >= date_trunc('month', current_date)::date then
    raise exception 'Solo se factura un mes ya cerrado' using errcode = '22023';
  end if;
  if exists (select 1 from public.facturas f where f.tipo = 'mensual' and f.emisor = v_yo and f.mes = v_mes) then
    raise exception 'Ese mes ya está facturado' using errcode = '23505';
  end if;
  -- la dietista (con sus datos de facturación puestos)
  select e.user_id into v_dietista from public.equipo e
    left join public.datos_fiscales df on df.user_id = e.user_id
   where e.rol = 'dietista' order by (df.user_id is null), df.actualizado desc limit 1;
  v_emisor := privado.ficha_fiscal(v_yo, 'Domingo');
  v_receptor := privado.ficha_fiscal(v_dietista, 'Fátima');

  select count(*), coalesce(sum(p.importe), 0) into v_n, v_cobrado
    from public.pagos p
   where p.anulado is null and p.fecha >= v_mes and p.fecha < (v_mes + interval '1 month')::date;
  if v_n = 0 then
    raise exception 'No hay pagos de clientes en ese mes' using errcode = '22023';
  end if;
  v_base := round(v_cobrado * 0.5, 2);
  v_ret := round(v_base * 0.15, 2);

  insert into public.facturas (emisor, serie, anio, numero, tipo, mes, datos, total)
  values (v_yo, 'D', v_anio, privado.siguiente_numero('D', v_anio), 'mensual', v_mes,
          jsonb_build_object('emisor', v_emisor, 'receptor', v_receptor,
                             'concepto', 'Asesoramiento en entrenamiento', 'mes', to_char(v_mes, 'YYYY-MM'),
                             'pagos_del_mes', v_n, 'cobrado', v_cobrado, 'porcentaje', 50,
                             'base', v_base, 'impuesto', jsonb_build_object('nombre', 'Exención Franquicia Fiscal', 'tipo', 0, 'cuota', 0),
                             'retencion', jsonb_build_object('nombre', 'Retención 15 %', 'tipo', 15, 'cuota', v_ret)),
          v_base - v_ret)
  returning codigo into v_codigo;
  return v_codigo;
end $$;
revoke all on function public.emitir_factura_mensual(date, jsonb) from public, anon;
grant execute on function public.emitir_factura_mensual(date, jsonb) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.facturas;
  end if;
end $$;

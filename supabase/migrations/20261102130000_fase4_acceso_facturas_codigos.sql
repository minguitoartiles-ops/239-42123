-- =====================================================================
-- Fitnessindramas · fase 4 (base de datos)
--   1. Acceso pagado y bloqueo por impago (con 7 días de margen)
--   2. Facturas correlativas y sin huecos: F (Fátima → clientes) y D (Domingo → Fátima, mensual)
--   3. Altas, códigos de acceso y límites de intentos del canje
--   4. Tarea diaria: avisos de impago en el chat y borrado a los 15 días
--
-- Calendario del impago (acceso_hasta = último día pagado):
--   hasta acceso_hasta ............ acceso completo
--   acceso_hasta + 1 … + 7 ........ margen: solo «cómo pagar», sus pagos y facturas, y el chat
--   desde acceso_hasta + 8 ........ sin acceso
--   desde acceso_hasta + 23 ....... se borran sus datos (15 días sin acceso); las facturas se conservan
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · Acceso pagado
-- ---------------------------------------------------------------------

alter table public.clientes
  add column acceso_hasta date not null default current_date;

alter table public.pagos
  add constraint pagos_periodo_razonable check (periodo_hasta is null or periodo_hasta <= fecha + 400);

-- Acceso completo: activo y con el pago al día
create or replace function privado.mi_cliente() returns uuid
  language sql stable security definer set search_path = ''
as $$
  select c.id from public.clientes c
  where c.user_id = auth.uid() and c.estado = 'activo' and c.acceso_hasta >= current_date
$$;

-- Acceso limitado: también durante los 7 días de margen (cómo pagar, pagos, facturas y chat)
create function privado.mi_cliente_limitado() returns uuid
  language sql stable security definer set search_path = ''
as $$
  select c.id from public.clientes c
  where c.user_id = auth.uid() and c.estado = 'activo' and c.acceso_hasta + 7 >= current_date
$$;

revoke all on function privado.mi_cliente_limitado() from public, anon;
grant execute on function privado.mi_cliente_limitado() to authenticated, service_role;

-- Registrar un pago con su periodo amplía el acceso al momento
create function privado.ampliar_acceso() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.periodo_hasta is not null then
    update public.clientes
       set acceso_hasta = greatest(acceso_hasta, new.periodo_hasta)
     where id = new.cliente_id;
  end if;
  return null;
end $$;
revoke all on function privado.ampliar_acceso() from public, anon, authenticated;

create trigger ampliar_acceso after insert on public.pagos
  for each row execute function privado.ampliar_acceso();

-- El equipo puede corregir la fecha a mano
grant update (acceso_hasta) on public.clientes to authenticated;

-- Lo que sigue visible durante el margen pasa a usar mi_cliente_limitado()
drop policy "clientes: cada cliente ve su ficha" on public.clientes;
create policy "clientes: cada cliente ve su ficha" on public.clientes for select to authenticated
  using (id = (select privado.mi_cliente_limitado()));

drop policy "mensajes: lee el equipo o su cliente" on public.mensajes;
create policy "mensajes: lee el equipo o su cliente" on public.mensajes for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado()));

drop policy "mensajes: escribe el equipo o su cliente" on public.mensajes;
create policy "mensajes: escribe el equipo o su cliente" on public.mensajes for insert to authenticated
  with check (
    autor = (select auth.uid())
    and lado = case when (select privado.es_equipo()) then 'in' else 'out' end
    and ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado()))
  );

drop policy "mensajes: vacía el autor" on public.mensajes;
create policy "mensajes: vacía el autor" on public.mensajes for update to authenticated
  using (autor = (select auth.uid())
         and ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado())))
  with check (autor = (select auth.uid()));

drop policy "pagos: lee el equipo o su cliente" on public.pagos;
create policy "pagos: lee el equipo o su cliente" on public.pagos for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado()));

drop policy "facturas: lee el equipo o su cliente" on public.facturas;
create policy "facturas: lee el equipo o su cliente" on public.facturas for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado()));

drop policy "config_pagos: lee el equipo o un cliente activo" on public.config_pagos;
create policy "config_pagos: lee el equipo o un cliente activo" on public.config_pagos for select to authenticated
  using ((select privado.es_equipo()) or (select privado.mi_cliente_limitado()) is not null);

-- ---------------------------------------------------------------------
-- 2 · Facturas
-- ---------------------------------------------------------------------

alter table public.facturas drop constraint facturas_emisor_serie_numero_key;
alter table public.facturas drop constraint facturas_serie_check;
alter table public.facturas
  add column tipo text not null check (tipo in ('cliente', 'mensual')),
  add column anio integer not null check (anio between 2026 and 2100),
  add column mes date,
  add constraint facturas_serie_valida check (serie in ('F', 'D')),
  add constraint facturas_tipo_serie check ((tipo = 'cliente' and serie = 'F') or (tipo = 'mensual' and serie = 'D')),
  add constraint facturas_mes_valido check ((tipo = 'mensual') = (mes is not null) and (mes is null or extract(day from mes) = 1)),
  add constraint facturas_cliente_valido check (tipo = 'cliente' or cliente_id is null),
  add constraint facturas_numero_unico unique (serie, anio, numero);
alter table public.facturas
  add column codigo text generated always as (serie || '-' || anio::text || '-' || lpad(numero::text, 4, '0')) stored;
create unique index facturas_una_mensual_por_mes on public.facturas (emisor, mes) where tipo = 'mensual';

-- Qué pago está en qué factura (un pago solo se factura una vez)
alter table public.pagos
  add column factura_id uuid references public.facturas (id) on delete restrict;

-- Contador por serie y año. Se incrementa dentro de la misma transacción que crea la
-- factura: si algo falla, se deshace todo y el número no se pierde.
create table privado.contadores_factura (
  serie  text not null,
  anio   integer not null,
  ultimo integer not null,
  primary key (serie, anio)
);
alter table privado.contadores_factura enable row level security;

create function privado.siguiente_numero(p_serie text, p_anio integer) returns integer
  language sql volatile security definer set search_path = ''
as $$
  insert into privado.contadores_factura as c (serie, anio, ultimo) values (p_serie, p_anio, 1)
  on conflict (serie, anio) do update set ultimo = c.ultimo + 1
  returning c.ultimo
$$;

-- Solo se guardan estos campos del receptor, recortados
create function privado.receptor_limpio(p jsonb) returns jsonb
  language plpgsql immutable set search_path = ''
as $$
begin
  if jsonb_typeof(p) is distinct from 'object' or coalesce(length(trim(p ->> 'nombre')), 0) = 0 then
    raise exception 'Faltan los datos del receptor de la factura' using errcode = '22023';
  end if;
  return jsonb_strip_nulls(jsonb_build_object(
    'nombre',    left(trim(p ->> 'nombre'), 120),
    'nif',       left(trim(p ->> 'nif'), 20),
    'direccion', left(trim(p ->> 'direccion'), 200),
    'email',     left(trim(p ->> 'email'), 254)));
end $$;

-- Fátima → cliente: factura uno o varios pagos de un mismo cliente que aún no estén facturados.
-- El total lo calcula el servidor a partir de los pagos; la app no puede inventarlo.
create function public.emitir_factura_cliente(p_pagos uuid[], p_receptor jsonb) returns text
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_yo       uuid := auth.uid();
  v_pagos    uuid[];
  v_n        integer;
  v_clientes integer;
  v_cliente  uuid;
  v_total    numeric(10, 2);
  v_lineas   jsonb;
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

  perform 1 from public.pagos p where p.id = any (v_pagos) for update;
  select count(*), count(distinct p.cliente_id), min(p.cliente_id::text)::uuid, sum(p.importe),
         jsonb_agg(jsonb_build_object('fecha', p.fecha, 'importe', p.importe, 'metodo', p.metodo,
                                      'desde', p.periodo_desde, 'hasta', p.periodo_hasta) order by p.fecha)
    into v_n, v_clientes, v_cliente, v_total, v_lineas
    from public.pagos p
   where p.id = any (v_pagos) and p.factura_id is null;
  if v_n <> cardinality(v_pagos) or v_clientes <> 1 then
    raise exception 'Algún pago no existe, ya está facturado o es de otro cliente' using errcode = '22023';
  end if;

  insert into public.facturas (emisor, serie, anio, numero, tipo, cliente_id, datos, total)
  values (v_yo, 'F', v_anio, privado.siguiente_numero('F', v_anio), 'cliente', v_cliente,
          jsonb_build_object('receptor', privado.receptor_limpio(p_receptor), 'lineas', v_lineas), v_total)
  returning id, codigo into v_id, v_codigo;

  update public.pagos set factura_id = v_id where id = any (v_pagos);
  return v_codigo;
end $$;

-- Domingo → Fátima: una al mes, por el total facturado por Fátima a clientes ese mes.
-- Solo meses ya cerrados.
create function public.emitir_factura_mensual(p_mes date, p_receptor jsonb) returns text
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_yo     uuid := auth.uid();
  v_mes    date := date_trunc('month', p_mes)::date;
  v_n      integer;
  v_total  numeric(10, 2);
  v_anio   integer := extract(year from current_date)::integer;
  v_codigo text;
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

  select count(*), coalesce(sum(f.total), 0) into v_n, v_total
    from public.facturas f
   where f.tipo = 'cliente' and f.fecha >= v_mes and f.fecha < (v_mes + interval '1 month')::date;
  if v_n = 0 then
    raise exception 'No hay facturas a clientes en ese mes' using errcode = '22023';
  end if;

  insert into public.facturas (emisor, serie, anio, numero, tipo, mes, datos, total)
  values (v_yo, 'D', v_anio, privado.siguiente_numero('D', v_anio), 'mensual', v_mes,
          jsonb_build_object('receptor', privado.receptor_limpio(p_receptor),
                             'mes', to_char(v_mes, 'YYYY-MM'), 'facturas_del_mes', v_n), v_total)
  returning codigo into v_codigo;
  return v_codigo;
end $$;

-- ---------------------------------------------------------------------
-- 3 · Altas, códigos de acceso y canje
--     Solo las usa el servidor (service_role). La huella del código es un HMAC con
--     un secreto que vive en las Edge Functions, nunca en la base de datos.
-- ---------------------------------------------------------------------

create unique index codigos_acceso_huella on privado.codigos_acceso (huella);
alter table privado.codigos_acceso
  add constraint codigos_huella_formato check (huella ~ '^[0-9a-f]{64}$');

create table privado.intentos_canje (
  id      bigint generated always as identity primary key,
  origen  text not null check (origen ~ '^[0-9a-f]{64}$'),   -- huella de la IP, nunca la IP
  momento timestamptz not null default now()
);
create index intentos_canje_origen on privado.intentos_canje (origen, momento);
create index intentos_canje_momento on privado.intentos_canje (momento);
alter table privado.intentos_canje enable row level security;

create function public.alta_cliente(p_por uuid, p_datos jsonb, p_acceso_hasta date, p_huella text) returns uuid
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.equipo e where e.user_id = p_por) then
    raise exception 'Solo el equipo da de alta clientes' using errcode = '42501';
  end if;
  if p_acceso_hasta is null or p_acceso_hasta < current_date or p_acceso_hasta > current_date + 400 then
    raise exception 'Fecha de acceso pagado no válida' using errcode = '22023';
  end if;
  insert into public.clientes (nombre, objetivo, email, telefono, acceso_hasta, actualizado_por)
  values (trim(p_datos ->> 'nombre'), nullif(trim(p_datos ->> 'objetivo'), ''),
          nullif(lower(trim(p_datos ->> 'email')), ''), nullif(regexp_replace(coalesce(p_datos ->> 'telefono', ''), '[^0-9+]', '', 'g'), ''),
          p_acceso_hasta, p_por)
  returning id into v_id;
  insert into public.salud (cliente_id) values (v_id);
  insert into public.planes_entreno (cliente_id) values (v_id);
  insert into public.planes_nutricion (cliente_id) values (v_id);
  insert into privado.codigos_acceso (cliente_id, huella, caduca) values (v_id, p_huella, now() + interval '3 days');
  return v_id;
end $$;

-- Código nuevo (el anterior caducó o se perdió). Solo si el cliente aún no tiene cuenta.
create function public.nuevo_codigo(p_por uuid, p_cliente uuid, p_huella text) returns void
  language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.equipo e where e.user_id = p_por) then
    raise exception 'Solo el equipo genera códigos' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clientes c where c.id = p_cliente and c.estado = 'activo' and c.user_id is null) then
    raise exception 'Este cliente no existe, está de baja o ya tiene cuenta' using errcode = '22023';
  end if;
  insert into privado.codigos_acceso (cliente_id, huella, caduca, usado)
  values (p_cliente, p_huella, now() + interval '3 days', null)
  on conflict (cliente_id) do update set huella = excluded.huella, caduca = excluded.caduca, usado = null;
end $$;

-- Límite de intentos: 10 por hora desde un mismo origen y 200 cada 10 minutos en total
create function public.permitir_intento_canje(p_origen text) returns boolean
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_mios  integer;
  v_todos integer;
begin
  insert into privado.intentos_canje (origen) values (p_origen);
  select count(*) into v_mios  from privado.intentos_canje where origen = p_origen and momento > now() - interval '1 hour';
  select count(*) into v_todos from privado.intentos_canje where momento > now() - interval '10 minutes';
  return v_mios <= 10 and v_todos <= 200;
end $$;

-- ¿Es válido este código? No lo gasta.
create function public.consultar_codigo(p_huella text) returns uuid
  language sql stable security definer set search_path = ''
as $$
  select k.cliente_id
    from privado.codigos_acceso k
    join public.clientes c on c.id = k.cliente_id
   where k.huella = p_huella and k.usado is null and k.caduca > now()
     and c.estado = 'activo' and c.user_id is null
$$;

-- Gasta el código y une la cuenta recién creada a la ficha. Devuelve null si ya no es válido.
create function public.vincular_cliente(p_huella text, p_user uuid) returns uuid
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_cliente uuid;
begin
  select k.cliente_id into v_cliente
    from privado.codigos_acceso k
    join public.clientes c on c.id = k.cliente_id
   where k.huella = p_huella and k.usado is null and k.caduca > now()
     and c.estado = 'activo' and c.user_id is null
     for update of k, c;
  if v_cliente is null then
    return null;
  end if;
  update privado.codigos_acceso set usado = now() where cliente_id = v_cliente;
  update public.clientes set user_id = p_user where id = v_cliente;
  return v_cliente;
end $$;

-- ---------------------------------------------------------------------
-- 4 · Tarea diaria
-- ---------------------------------------------------------------------

create table privado.avisos_enviados (
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  tipo       text not null,
  referencia date not null,
  enviado    timestamptz not null default now(),
  primary key (cliente_id, tipo, referencia)
);
alter table privado.avisos_enviados enable row level security;

-- Cuentas y archivos que quedan por borrar fuera de la base de datos (lo hace la Edge Function de limpieza)
create table privado.borrados_pendientes (
  id         bigint generated always as identity primary key,
  cliente_id uuid not null,
  user_id    uuid,
  motivo     text not null check (motivo in ('baja', 'impago')),
  creado     timestamptz not null default now(),
  procesado  timestamptz
);
alter table privado.borrados_pendientes enable row level security;

create function public.tarea_diaria() returns jsonb
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_avisos  integer := 0;
  v_n       integer;
  v_borrados integer := 0;
  r record;
begin
  -- Aviso 1: el pago acaba de vencer
  for r in
    select c.id, c.acceso_hasta from public.clientes c
     where c.estado = 'activo' and current_date > c.acceso_hasta and current_date <= c.acceso_hasta + 7
       and not exists (select 1 from privado.avisos_enviados a
                        where a.cliente_id = c.id and a.tipo = 'pago_vencido' and a.referencia = c.acceso_hasta)
  loop
    insert into public.mensajes (cliente_id, lado, texto) values (r.id, 'in',
      'Aviso automático: tu pago venció el ' || to_char(r.acceso_hasta, 'DD/MM/YYYY') ||
      '. Hasta el ' || to_char(r.acceso_hasta + 7, 'DD/MM/YYYY') ||
      ' solo puedes ver cómo pagar y este chat; después perderás el acceso a la app. Si ya has pagado, escríbenos por aquí.');
    insert into privado.avisos_enviados (cliente_id, tipo, referencia) values (r.id, 'pago_vencido', r.acceso_hasta);
    v_avisos := v_avisos + 1;
  end loop;

  -- Aviso 2: quedan 2 días o menos para perder el acceso
  for r in
    select c.id, c.acceso_hasta from public.clientes c
     where c.estado = 'activo' and current_date >= c.acceso_hasta + 5 and current_date <= c.acceso_hasta + 7
       and not exists (select 1 from privado.avisos_enviados a
                        where a.cliente_id = c.id and a.tipo = 'corte_cercano' and a.referencia = c.acceso_hasta)
  loop
    insert into public.mensajes (cliente_id, lado, texto) values (r.id, 'in',
      'Aviso automático: el ' || to_char(r.acceso_hasta + 8, 'DD/MM/YYYY') ||
      ' perderás el acceso a la app si no se registra tu pago. Pasados 15 días sin acceso, se borrarán tus datos.');
    insert into privado.avisos_enviados (cliente_id, tipo, referencia) values (r.id, 'corte_cercano', r.acceso_hasta);
    v_avisos := v_avisos + 1;
  end loop;

  -- Borrado: 15 días de baja, o 15 días sin acceso por impago. Las facturas se conservan.
  insert into privado.borrados_pendientes (cliente_id, user_id, motivo)
  select c.id, c.user_id, case when c.estado = 'baja' then 'baja' else 'impago' end
    from public.clientes c
   where (c.estado = 'baja' and (c.baja ->> 'fecha')::timestamptz < now() - interval '15 days')
      or (c.estado = 'activo' and c.acceso_hasta + 22 < current_date);
  get diagnostics v_borrados = row_count;

  delete from public.clientes c
   where (c.estado = 'baja' and (c.baja ->> 'fecha')::timestamptz < now() - interval '15 days')
      or (c.estado = 'activo' and c.acceso_hasta + 22 < current_date);

  -- Los intentos de canje solo hacen falta unas horas
  delete from privado.intentos_canje where momento < now() - interval '2 days';
  get diagnostics v_n = row_count;

  return jsonb_build_object('avisos', v_avisos, 'borrados', v_borrados);
end $$;

-- Lista y cierre de los borrados pendientes, para la Edge Function de limpieza
create function public.borrados_por_procesar() returns table (id bigint, cliente_id uuid, user_id uuid)
  language sql stable security definer set search_path = ''
as $$ select b.id, b.cliente_id, b.user_id from privado.borrados_pendientes b where b.procesado is null order by b.id limit 100 $$;

create function public.marcar_borrado(p_id bigint) returns void
  language sql volatile security definer set search_path = ''
as $$ update privado.borrados_pendientes set procesado = now() where id = p_id $$;

-- ---------------------------------------------------------------------
-- 5 · Permisos de las funciones nuevas
-- ---------------------------------------------------------------------

revoke all on all functions in schema public  from public, anon, authenticated;
revoke all on all functions in schema privado from public, anon;
revoke all on privado.contadores_factura, privado.intentos_canje, privado.avisos_enviados, privado.borrados_pendientes
  from public, anon, authenticated;

-- La app (con sesión) solo puede emitir facturas; cada función comprueba quién la llama
grant execute on function public.emitir_factura_cliente(uuid[], jsonb), public.emitir_factura_mensual(date, jsonb) to authenticated;
grant execute on function privado.mi_rol(), privado.es_equipo(), privado.mi_cliente(), privado.mi_cliente_limitado() to authenticated;

-- El resto, solo el servidor
grant execute on all functions in schema public  to service_role;
grant execute on all functions in schema privado to service_role;
grant all on privado.contadores_factura, privado.intentos_canje, privado.avisos_enviados, privado.borrados_pendientes to service_role;
grant all on all tables in schema public to service_role;

-- La tarea diaria se programa con pg_cron donde esté disponible (Supabase lo incluye)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('tarea-diaria', '0 4 * * *', 'select public.tarea_diaria()');
  end if;
end $$;

-- =====================================================================
-- Fitnessindramas · anular un pago apuntado por error (pedido por Domingo, 6/11/2026)
--
-- Un pago no se borra ni se cambia: se anula, con motivo, quién y cuándo, y queda a la vista.
--   · Solo el equipo, y solo si el pago aún no tiene factura (una factura no se toca: haría falta
--     una factura rectificativa, que llega con el paso de facturas).
--   · «Pagado hasta» vuelve a la fecha que tenía antes de ese pago, salvo que después se haya
--     cambiado (otro pago o un cambio a mano): entonces no se toca.
--   · Un pago anulado no se puede facturar.
-- =====================================================================

alter table public.pagos
  add column acceso_antes  date,                                  -- «pagado hasta» antes de este pago (lo pone el servidor)
  add column anulado       timestamptz,
  add column anulado_por   uuid references auth.users (id) on delete set null,
  add column anulado_motivo text check (char_length(anulado_motivo) <= 200);

-- Al registrar un pago se guarda cómo estaba «pagado hasta» (también cuando lo hace el servidor)
create or replace function privado.revisar_pago() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  new.acceso_antes := (select c.acceso_hasta from public.clientes c where c.id = new.cliente_id);
  new.anulado := null; new.anulado_por := null; new.anulado_motivo := null;
  if auth.uid() is null then
    return new;
  end if;
  if new.fecha is null or new.fecha < current_date - 400 or new.fecha > current_date + 1 then
    raise exception 'La fecha del pago no es válida' using errcode = '23514';
  end if;
  if not exists (select 1 from public.clientes c where c.id = new.cliente_id and c.estado = 'activo') then
    raise exception 'Este cliente no existe o está de baja' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function privado.revisar_pago() from public, anon, authenticated;

create function public.anular_pago(p_id uuid, p_motivo text) returns void
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  p public.pagos%rowtype;
begin
  if not (select privado.es_equipo()) then
    raise exception 'Solo el equipo anula pagos' using errcode = '42501';
  end if;
  if coalesce(length(trim(p_motivo)), 0) = 0 then
    raise exception 'Escribe por qué se anula' using errcode = '22023';
  end if;
  select * into p from public.pagos where id = p_id for update;
  if not found then
    raise exception 'Ese pago no existe' using errcode = '22023';
  end if;
  if p.anulado is not null then
    raise exception 'Ese pago ya está anulado' using errcode = '22023';
  end if;
  if p.factura_id is not null then
    raise exception 'Ese pago ya tiene factura: hace falta una factura rectificativa' using errcode = '22023';
  end if;
  update public.pagos
     set anulado = now(), anulado_por = auth.uid(), anulado_motivo = left(trim(p_motivo), 200)
   where id = p_id;
  -- «Pagado hasta» vuelve atrás solo si sigue siendo el que dejó este pago.
  -- Se toca la ficha siempre, para que los demás aparatos se enteren al momento.
  update public.clientes c
     set acceso_hasta = case when p.periodo_hasta is not null and p.acceso_antes is not null
                                  and c.acceso_hasta = p.periodo_hasta
                             then p.acceso_antes else c.acceso_hasta end
   where c.id = p.cliente_id;
end $$;
revoke all on function public.anular_pago(uuid, text) from public, anon;
grant execute on function public.anular_pago(uuid, text) to authenticated;

-- Un pago anulado no se factura
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
   where p.id = any (v_pagos) and p.factura_id is null and p.anulado is null;
  if v_n <> cardinality(v_pagos) or v_clientes <> 1 then
    raise exception 'Algún pago no existe, ya está facturado, está anulado o es de otro cliente' using errcode = '22023';
  end if;

  insert into public.facturas (emisor, serie, anio, numero, tipo, cliente_id, datos, total)
  values (v_yo, 'F', v_anio, privado.siguiente_numero('F', v_anio), 'cliente', v_cliente,
          jsonb_build_object('receptor', privado.receptor_limpio(p_receptor), 'lineas', v_lineas), v_total)
  returning id, codigo into v_id, v_codigo;

  update public.pagos set factura_id = v_id where id = any (v_pagos);
  return v_codigo;
end $$;
revoke all on function public.emitir_factura_cliente(uuid[], jsonb) from public, anon;
grant execute on function public.emitir_factura_cliente(uuid[], jsonb) to authenticated;

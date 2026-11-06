-- =====================================================================
-- Fitnessindramas · pagos y bajas desde la app (paso 7)
--
-- La base (pagos, acceso pagado con 7 días de margen, baja, borrado a los 15 días) ya estaba
-- desde la fase 4. Aquí se añade lo que necesita la app para usarla sin riesgos:
--   1. Pagos: fecha razonable y solo a clientes activos (no a uno de baja).
--   2. Ficha: «pagado hasta» dentro de un margen razonable; al reactivar una baja, el cliente
--      vuelve en el margen de pago (ve cómo pagar y el chat) y el borrado por impago no le
--      alcanza esa misma noche aunque llevara tiempo sin pagar.
--   3. Datos de pago: el enlace de pago (Stripe, PayPal…) también en el servidor, y los
--      números de Bizum comprobados.
-- Decisión de Domingo (5/11/2026): la ficha de un cliente de baja se borra a los 15 días
-- (ya lo hacía la tarea diaria); las facturas se conservan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · Pagos
-- ---------------------------------------------------------------------
create function privado.revisar_pago() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;                                   -- el servidor (tareas, pruebas) no pasa por aquí
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

create trigger revisar before insert on public.pagos
  for each row execute function privado.revisar_pago();

-- ---------------------------------------------------------------------
-- 2 · Ficha: acceso pagado y reactivar
-- ---------------------------------------------------------------------
create function privado.revisar_acceso() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is not null and new.acceso_hasta is distinct from old.acceso_hasta
     and (new.acceso_hasta < current_date - 400 or new.acceso_hasta > current_date + 400) then
    raise exception 'La fecha de «pagado hasta» no es válida' using errcode = '23514';
  end if;
  -- Reactivar: vuelve como mínimo en el margen de pago (ayer fue su último día pagado)
  if old.estado = 'baja' and new.estado = 'activo' then
    new.acceso_hasta := greatest(new.acceso_hasta, current_date - 1);
  end if;
  return new;
end $$;
revoke all on function privado.revisar_acceso() from public, anon, authenticated;

create trigger revisar_acceso before update on public.clientes
  for each row execute function privado.revisar_acceso();

-- ---------------------------------------------------------------------
-- 3 · Datos de pago
-- ---------------------------------------------------------------------
create function privado.bizum_valido(p text[]) returns boolean
  language sql immutable set search_path = ''
as $$ select coalesce(bool_and(x ~ '^\+?[0-9 ]{9,16}$'), true) from unnest(p) x $$;

alter table public.config_pagos
  add column enlace text check (enlace is null or (char_length(enlace) <= 300 and enlace ~ '^https://[^[:space:]"''<>]+$')),
  add constraint config_pagos_bizum_valido check (privado.bizum_valido(bizum));

grant update (enlace) on public.config_pagos to authenticated;

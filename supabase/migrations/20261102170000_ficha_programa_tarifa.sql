-- =====================================================================
-- Fitnessindramas · la ficha del cliente guarda también lo que se pide en el alta:
-- duración del programa, tarifa y precio, y la fecha de inicio del programa (de ella sale
-- «semana 3 de 12»; la fecha de alta real no se toca). Solo el equipo los cambia.
-- =====================================================================

alter table public.clientes
  add column programa_semanas integer not null default 12 check (programa_semanas between 1 and 52),
  add column tarifa text not null default 'mensual'
    check (tarifa in ('mensual', 'trimestral', 'semestral', 'anual', 'ninguna')),
  add column precio numeric(10, 2) check (precio is null or (precio >= 0 and precio < 100000)),
  add column inicio_programa date not null default current_date check (inicio_programa >= date '2024-01-01');

grant update (programa_semanas, tarifa, precio, inicio_programa) on public.clientes to authenticated;

-- El alta acepta los datos nuevos (si no vienen, se usan los de por defecto)
create or replace function public.alta_cliente(p_por uuid, p_datos jsonb, p_acceso_hasta date, p_huella text) returns uuid
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_semanas text := p_datos ->> 'programa_semanas';
  v_precio  text := p_datos ->> 'precio';
begin
  if not exists (select 1 from public.equipo e where e.user_id = p_por) then
    raise exception 'Solo el equipo da de alta clientes' using errcode = '42501';
  end if;
  if p_acceso_hasta is null or p_acceso_hasta < current_date or p_acceso_hasta > current_date + 400 then
    raise exception 'Fecha de acceso pagado no válida' using errcode = '22023';
  end if;
  if v_semanas is not null and v_semanas !~ '^[0-9]{1,3}$' then
    raise exception 'Duración del programa no válida' using errcode = '22023';
  end if;
  if v_precio is not null and v_precio !~ '^[0-9]{1,5}(\.[0-9]{1,2})?$' then
    raise exception 'Precio no válido' using errcode = '22023';
  end if;
  insert into public.clientes (nombre, objetivo, email, telefono, acceso_hasta, actualizado_por,
                               programa_semanas, tarifa, precio)
  values (trim(p_datos ->> 'nombre'), nullif(trim(p_datos ->> 'objetivo'), ''),
          nullif(lower(trim(p_datos ->> 'email')), ''), nullif(regexp_replace(coalesce(p_datos ->> 'telefono', ''), '[^0-9+]', '', 'g'), ''),
          p_acceso_hasta, p_por,
          coalesce(v_semanas::integer, 12), coalesce(nullif(p_datos ->> 'tarifa', ''), 'mensual'), v_precio::numeric)
  returning id into v_id;
  insert into public.salud (cliente_id) values (v_id);
  insert into public.planes_entreno (cliente_id) values (v_id);
  insert into public.planes_nutricion (cliente_id) values (v_id);
  insert into privado.codigos_acceso (cliente_id, huella, caduca) values (v_id, p_huella, now() + interval '3 days');
  return v_id;
end $$;

revoke all on function public.alta_cliente(uuid, jsonb, date, text) from public, anon, authenticated;
grant execute on function public.alta_cliente(uuid, jsonb, date, text) to service_role;

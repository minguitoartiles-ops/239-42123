-- =====================================================================
-- Fitnessindramas · cuenta del cliente y cuestionario (pedido por Domingo, 8/11/2026)
--
--   · En el alta ya no se escriben a mano el correo ni el teléfono: el correo es el de la cuenta
--     que crea el cliente (se copia a su ficha al crear la cuenta) y el teléfono lo pone él en el
--     cuestionario inicial.
--   · «cuenta_desde»: cuándo creó su cuenta y entró por primera vez, para avisar a Domingo y Fátima
--     de que todo ha ido bien.
--   · El cuestionario inicial (con sus datos de salud) se guarda en public.salud, que ya existía:
--     lo escribe solo el propio cliente y lo leen él y el equipo.
-- =====================================================================
alter table public.clientes add column cuenta_desde timestamptz;

create or replace function public.vincular_cliente(p_huella text, p_user uuid) returns uuid
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
  update public.clientes c
     set user_id = p_user,
         cuenta_desde = now(),
         email = coalesce(c.email, (select lower(u.email) from auth.users u where u.id = p_user))
   where c.id = v_cliente;
  return v_cliente;
end $$;
revoke all on function public.vincular_cliente(text, uuid) from public, anon, authenticated;
grant execute on function public.vincular_cliente(text, uuid) to service_role;

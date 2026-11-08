-- =====================================================================
-- Fitnessindramas · «Marcar como resuelto» en el servidor (8/11/2026)
--
-- Quitar el «sin contestar» de un chat sin escribir nada al cliente se guardaba solo en el aparato.
-- Ahora se guarda en el «leído hasta aquí» de cada profesional (chat_lecturas.resuelto): cada uno
-- solo ve y cambia lo suyo, y sale igual en el móvil y en el ordenador.
--   · «resuelto» solo avanza (ni hacia atrás ni al futuro), como «hasta».
--   · El resumen del equipo cuenta «espera_desde» desde el último mensaje de un profesional o
--     desde lo que ese profesional dio por resuelto, lo que sea más reciente: si el cliente vuelve
--     a escribir después, vuelve a contar.
-- =====================================================================
alter table public.chat_lecturas add column resuelto timestamptz;
grant insert (resuelto), update (resuelto) on public.chat_lecturas to authenticated;

create or replace function privado.preparar_lectura() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  new.hasta := least(coalesce(new.hasta, now()), now());          -- nunca en el futuro
  new.resuelto := least(new.resuelto, now());
  if tg_op = 'UPDATE' then
    new.hasta := greatest(old.hasta, new.hasta);                   -- ni hacia atrás
    new.resuelto := greatest(old.resuelto, new.resuelto);
    new.user_id := old.user_id;
  end if;
  return new;
end $$;
revoke all on function privado.preparar_lectura() from public, anon, authenticated;

create or replace function public.resumen_chats()
returns table (cliente_id uuid, ultimo_fecha timestamptz, ultimo_lado text, ultimo_autor uuid, ultimo_tipo text,
               ultimo_texto text, ultimo_eliminado boolean, sin_leer integer, espera_desde timestamptz)
  language sql stable security invoker set search_path = ''
as $$
  with yo as (select auth.uid() as id, (select privado.es_equipo()) as equipo),
  ult as (
    select distinct on (m.cliente_id) m.cliente_id, m.fecha, m.lado, m.autor, m.tipo, left(m.texto, 120) as texto, m.eliminado
      from public.mensajes m order by m.cliente_id, m.fecha desc, m.id desc
  )
  select u.cliente_id, u.fecha, u.lado, u.autor, u.tipo, u.texto, u.eliminado,
    greatest(
      (select count(*)::int from public.mensajes m, yo
        where m.cliente_id = u.cliente_id and not m.eliminado
          and m.lado = case when yo.equipo then 'out' else 'in' end
          and m.fecha > coalesce((select l.hasta from public.chat_lecturas l
                                   where l.user_id = yo.id and l.cliente_id = u.cliente_id), '-infinity')),
      case when exists (select 1 from public.chat_lecturas l, yo
                         where l.user_id = yo.id and l.cliente_id = u.cliente_id and l.no_leido) then 1 else 0 end),
    (select min(m.fecha) from public.mensajes m, yo
      where yo.equipo and m.cliente_id = u.cliente_id and m.lado = 'out' and not m.eliminado
        and m.fecha > greatest(
              coalesce((select max(r.fecha) from public.mensajes r
                         where r.cliente_id = u.cliente_id and r.lado = 'in' and r.autor is not null), '-infinity'),
              coalesce((select l.resuelto from public.chat_lecturas l
                         where l.user_id = yo.id and l.cliente_id = u.cliente_id), '-infinity')))
  from ult u
$$;
revoke all on function public.resumen_chats() from public, anon;
grant execute on function public.resumen_chats() to authenticated;

-- =====================================================================
-- Fitnessindramas · «Marcar como no leído» en el chat
--
-- Domingo y Fátima pueden dejar un chat como pendiente (clic derecho en la lista de chats).
-- Se guarda en su «leído hasta aquí» (chat_lecturas): cada uno solo ve y cambia el suyo, y sale
-- igual en el móvil y en el ordenador. Al abrir el chat y leerlo, la marca se quita.
-- El resumen cuenta ese chat como mínimo con 1 mensaje sin leer.
-- =====================================================================
alter table public.chat_lecturas add column no_leido boolean not null default false;
grant insert (no_leido), update (no_leido) on public.chat_lecturas to authenticated;

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
        and m.fecha > coalesce((select max(r.fecha) from public.mensajes r
                                 where r.cliente_id = u.cliente_id and r.lado = 'in' and r.autor is not null), '-infinity'))
  from ult u
$$;
revoke all on function public.resumen_chats() from public, anon;
grant execute on function public.resumen_chats() to authenticated;

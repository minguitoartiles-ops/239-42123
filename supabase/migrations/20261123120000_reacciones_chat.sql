-- =====================================================================
-- Reacciones con emoticonos en el chat (23/11/2026, pedido por Domingo)
--   · Como en WhatsApp: cada persona pone como mucho una reacción por mensaje (👍 ❤️ 😂 😮 😢 🙏).
--     Poner otra la cambia; quitarla deja el emoticono vacío (no se borra la fila: así el aviso en
--     tiempo real llega con el cliente y RLS decide quién lo recibe).
--   · Solo en los chats que cada uno puede ver (el equipo, todos; el cliente, el suyo, también en los
--     7 días de margen). El autor y el chat los pone el servidor, no la app.
--   · No avisa ni cuenta como «sin leer» (decisión de Domingo).
--   · Cuenta en el límite de escrituras del cliente.
-- =====================================================================

create table public.reacciones (
  mensaje_id  uuid not null references public.mensajes (id) on delete cascade,
  autor       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  emoji       text check (emoji is null or emoji in ('👍', '❤️', '😂', '😮', '😢', '🙏')),
  fecha       timestamptz not null default now(),
  primary key (mensaje_id, autor)
);
create index reacciones_cliente on public.reacciones (cliente_id);

-- El autor es quien llama; el chat, el del mensaje (que tiene que existir y no estar eliminado)
create function privado.preparar_reaccion() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  v_cliente uuid;
begin
  if pg_trigger_depth() > 1 then            -- lo hace el servidor (al eliminar un mensaje)
    return new;
  end if;
  if tg_op = 'UPDATE' and new.mensaje_id is distinct from old.mensaje_id then
    raise exception 'Una reacción no se cambia de mensaje' using errcode = '23514';
  end if;
  select m.cliente_id into v_cliente from public.mensajes m where m.id = new.mensaje_id and not m.eliminado;
  if v_cliente is null then
    raise exception 'Ese mensaje no admite reacciones' using errcode = '23514';
  end if;
  new.autor := coalesce(auth.uid(), new.autor);
  new.cliente_id := v_cliente;
  new.fecha := now();
  return new;
end $$;
revoke all on function privado.preparar_reaccion() from public, anon, authenticated;

create trigger preparar before insert or update on public.reacciones
  for each row execute function privado.preparar_reaccion();
create trigger limitar_escrituras before insert or update on public.reacciones
  for each row execute function privado.limitar_escrituras();

-- Al eliminar un mensaje, sus reacciones se quitan
create function privado.quitar_reacciones() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.eliminado and not old.eliminado then
    delete from public.reacciones where mensaje_id = new.id;
  end if;
  return null;
end $$;
revoke all on function privado.quitar_reacciones() from public, anon, authenticated;
create trigger quitar_reacciones after update on public.mensajes
  for each row execute function privado.quitar_reacciones();

alter table public.reacciones enable row level security;
revoke all on public.reacciones from public, anon, authenticated;
-- update de mensaje_id: lo pide el «upsert» de la API; el trigger impide cambiarlo
grant select, insert (mensaje_id, emoji), update (mensaje_id, emoji) on public.reacciones to authenticated;
grant all on public.reacciones to service_role;

create policy "reacciones: las ven el equipo y su cliente" on public.reacciones for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado()));
create policy "reacciones: cada uno pone la suya" on public.reacciones for insert to authenticated
  with check (autor = (select auth.uid())
              and ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado())));
create policy "reacciones: cada uno cambia la suya" on public.reacciones for update to authenticated
  using (autor = (select auth.uid())
         and ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado())))
  with check (autor = (select auth.uid())
              and ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado())));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.reacciones;
  end if;
end $$;

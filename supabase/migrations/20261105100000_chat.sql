-- =====================================================================
-- Fitnessindramas · paso 4: el chat desde el servidor
--
--   1. Mensajes: marca «reenviado» y etiqueta «revisión de seguimiento» (solo el equipo
--      las puede poner) y límite de mensajes seguidos por persona.
--   2. Mensaje fijado: uno por chat, lo ven el cliente y el equipo.
--   3. Dudas entre profesionales: solo las ve el equipo, nunca el cliente.
--   4. «Leído hasta aquí» de cada persona en cada chat, para que los mensajes sin leer
--      coincidan en todos sus aparatos.
--   5. Nombres del equipo para el cliente (solo nombre y papel), para saber quién le escribe.
--
-- Borrar un mensaje sigue siendo solo cosa de su autor, y solo se vacía («Mensaje eliminado»).
-- Nada de esto se borra con DELETE desde la app: quitar un fijado o una duda es un cambio de
-- estado. Así el tiempo real no reparte avisos de borrado (que no pasan por las políticas).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · Mensajes
-- ---------------------------------------------------------------------
alter table public.mensajes
  add column reenviado boolean not null default false,
  add column etiqueta  text check (etiqueta in ('revision'));     -- revision = revisión de tu seguimiento

create index mensajes_autor_fecha on public.mensajes (autor, fecha);

grant insert (reenviado, etiqueta) on public.mensajes to authenticated;

-- Lo que el cliente no puede marcar y el límite de mensajes seguidos
create function privado.reglas_mensaje() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  v_yo uuid := auth.uid();
begin
  if v_yo is null then                      -- servidor (avisos automáticos)
    return new;
  end if;
  if not privado.es_equipo() then
    new.reenviado := false;
    new.etiqueta := null;
  end if;
  if (select count(*) from public.mensajes m
       where m.autor = v_yo and m.fecha > now() - interval '1 minute') >= 20 then
    raise exception 'Has enviado muchos mensajes seguidos. Espera un momento.' using errcode = '54000';
  end if;
  if (select count(*) from public.mensajes m
       where m.autor = v_yo and m.fecha > now() - interval '1 day') >= 500 then
    raise exception 'Has llegado al límite de mensajes de hoy.' using errcode = '54000';
  end if;
  return new;
end $$;
revoke all on function privado.reglas_mensaje() from public, anon, authenticated;

create trigger reglas before insert on public.mensajes for each row execute function privado.reglas_mensaje();

-- ---------------------------------------------------------------------
-- 2 · Mensaje fijado (uno por chat; quitarlo = mensaje_id vacío)
-- ---------------------------------------------------------------------
create table public.chat_fijado (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null unique references public.clientes (id) on delete cascade,
  mensaje_id  uuid references public.mensajes (id) on delete set null,
  por         uuid default auth.uid() references auth.users (id) on delete set null,
  fecha       timestamptz not null default now()
);

create function privado.preparar_fijado() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then            -- lo suelta el servidor al vaciar el mensaje
    return new;
  end if;
  new.por := auth.uid();
  new.fecha := now();
  if new.mensaje_id is not null and not exists (
       select 1 from public.mensajes m
        where m.id = new.mensaje_id and m.cliente_id = new.cliente_id and not m.eliminado) then
    raise exception 'Ese mensaje no se puede fijar en este chat' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function privado.preparar_fijado() from public, anon, authenticated;

create trigger preparar     before insert or update on public.chat_fijado for each row execute function privado.preparar_fijado();
create trigger cliente_fijo before update on public.chat_fijado for each row execute function privado.cliente_fijo();

alter table public.chat_fijado enable row level security;
revoke all on public.chat_fijado from public, anon, authenticated;
-- update de cliente_id: lo pide el «upsert» de la API; el trigger cliente_fijo impide cambiarlo
grant select, insert (cliente_id, mensaje_id), update (cliente_id, mensaje_id) on public.chat_fijado to authenticated;
grant all on public.chat_fijado to service_role;

create policy "fijado: lo ven el equipo y su cliente" on public.chat_fijado for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado()));
create policy "fijado: lo pone el equipo o su cliente" on public.chat_fijado for insert to authenticated
  with check ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado()));
create policy "fijado: lo cambia el equipo o su cliente" on public.chat_fijado for update to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado()))
  with check ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado()));

-- ---------------------------------------------------------------------
-- 3 · Dudas entre profesionales (el cliente no las ve nunca)
-- ---------------------------------------------------------------------
create table public.dudas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  mensaje_id  uuid not null references public.mensajes (id) on delete cascade,
  de          uuid default auth.uid() references auth.users (id) on delete set null,
  para        uuid not null references public.equipo (user_id) on delete cascade,
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'resuelta', 'quitada')),
  creada      timestamptz not null default now(),
  cerrada_por uuid references auth.users (id) on delete set null,
  cerrada_en  timestamptz
);
create index dudas_cliente on public.dudas (cliente_id);
create unique index dudas_una_pendiente on public.dudas (mensaje_id) where estado = 'pendiente';

create function privado.preparar_duda() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.de := auth.uid();
    new.estado := 'pendiente';
    new.creada := now();
    new.cerrada_por := null;
    new.cerrada_en := null;
    if new.para = new.de then
      raise exception 'La duda es para tu compañero' using errcode = '23514';
    end if;
    if not exists (select 1 from public.mensajes m
                    where m.id = new.mensaje_id and m.cliente_id = new.cliente_id
                      and m.lado = 'out' and not m.eliminado) then
      raise exception 'Solo se marcan como duda mensajes del cliente de este chat' using errcode = '23514';
    end if;
    return new;
  end if;

  -- UPDATE: solo se cierra una duda pendiente
  if pg_trigger_depth() > 1 then            -- la quita el servidor al vaciar el mensaje
    return new;
  end if;
  if old.estado <> 'pendiente' or new.estado = 'pendiente' then
    raise exception 'Esta duda ya está cerrada' using errcode = '42501';
  end if;
  if new.estado = 'resuelta' and old.para is distinct from auth.uid() then
    raise exception 'Solo la resuelve a quien se le pregunta' using errcode = '42501';
  end if;
  if new.estado = 'quitada' and old.de is distinct from auth.uid() then
    raise exception 'Solo la quita quien la planteó' using errcode = '42501';
  end if;
  new.cerrada_por := auth.uid();
  new.cerrada_en := now();
  return new;
end $$;
revoke all on function privado.preparar_duda() from public, anon, authenticated;

create trigger preparar     before insert or update on public.dudas for each row execute function privado.preparar_duda();
create trigger cliente_fijo before update on public.dudas for each row execute function privado.cliente_fijo();

alter table public.dudas enable row level security;
revoke all on public.dudas from public, anon, authenticated;
grant select, insert (cliente_id, mensaje_id, para), update (estado) on public.dudas to authenticated;
grant all on public.dudas to service_role;

create policy "dudas: solo las ve el equipo" on public.dudas for select to authenticated
  using ((select privado.es_equipo()));
create policy "dudas: las plantea el equipo" on public.dudas for insert to authenticated
  with check ((select privado.es_equipo()) and de = (select auth.uid()));
create policy "dudas: las cierran los suyos" on public.dudas for update to authenticated
  using ((select privado.es_equipo()) and (para = (select auth.uid()) or de = (select auth.uid())))
  with check ((select privado.es_equipo()));

-- ---------------------------------------------------------------------
-- 4 · «Leído hasta aquí» (cada persona, cada chat)
-- ---------------------------------------------------------------------
create table public.chat_lecturas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  hasta       timestamptz not null default now(),
  unique (user_id, cliente_id)
);

create function privado.preparar_lectura() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  new.hasta := least(coalesce(new.hasta, now()), now());          -- nunca en el futuro
  if tg_op = 'UPDATE' then
    new.hasta := greatest(old.hasta, new.hasta);                   -- ni hacia atrás
    new.user_id := old.user_id;
  end if;
  return new;
end $$;
revoke all on function privado.preparar_lectura() from public, anon, authenticated;

create trigger preparar     before insert or update on public.chat_lecturas for each row execute function privado.preparar_lectura();
create trigger cliente_fijo before update on public.chat_lecturas for each row execute function privado.cliente_fijo();

alter table public.chat_lecturas enable row level security;
revoke all on public.chat_lecturas from public, anon, authenticated;
grant select, insert (cliente_id, hasta), update (cliente_id, hasta) on public.chat_lecturas to authenticated;
grant all on public.chat_lecturas to service_role;

create policy "lecturas: cada uno las suyas" on public.chat_lecturas for select to authenticated
  using (user_id = (select auth.uid()));
create policy "lecturas: las apunta cada uno" on public.chat_lecturas for insert to authenticated
  with check (user_id = (select auth.uid())
              and ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado())));
create policy "lecturas: las mueve cada uno" on public.chat_lecturas for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado())));

-- ---------------------------------------------------------------------
-- 5 · Al vaciar un mensaje: deja de estar fijado y sus dudas pendientes se quitan
-- ---------------------------------------------------------------------
create function privado.soltar_mensaje() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.eliminado and not old.eliminado then
    update public.chat_fijado set mensaje_id = null where mensaje_id = new.id;
    update public.dudas set estado = 'quitada', cerrada_en = now()
     where mensaje_id = new.id and estado = 'pendiente';
  end if;
  return null;
end $$;
revoke all on function privado.soltar_mensaje() from public, anon, authenticated;

create trigger soltar after update on public.mensajes for each row execute function privado.soltar_mensaje();

-- ---------------------------------------------------------------------
-- 6 · Nombres del equipo (para el chat): solo nombre y papel, y solo para quien tiene acceso
-- ---------------------------------------------------------------------
create function public.nombres_equipo() returns table (user_id uuid, nombre text, rol text)
  language sql stable security definer set search_path = ''
as $$
  select e.user_id, e.nombre, e.rol from public.equipo e
   where (select privado.es_equipo()) or (select privado.mi_cliente_limitado()) is not null
   order by e.nombre
$$;
revoke all on function public.nombres_equipo() from public, anon;
grant execute on function public.nombres_equipo() to authenticated;

-- ---------------------------------------------------------------------
-- 7 · Resumen de los chats que puede ver quien pregunta (lista de chats y globos de «sin leer»)
--     Se ejecuta con los permisos de quien llama: las políticas deciden qué chats entran.
--     sin_leer ...... mensajes del otro lado posteriores a su «leído hasta aquí»
--     espera_desde .. (equipo) primer mensaje del cliente sin respuesta de ningún profesional
-- ---------------------------------------------------------------------
create function public.resumen_chats()
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
    (select count(*)::int from public.mensajes m, yo
      where m.cliente_id = u.cliente_id and not m.eliminado
        and m.lado = case when yo.equipo then 'out' else 'in' end
        and m.fecha > coalesce((select l.hasta from public.chat_lecturas l
                                 where l.user_id = yo.id and l.cliente_id = u.cliente_id), '-infinity')),
    (select min(m.fecha) from public.mensajes m, yo
      where yo.equipo and m.cliente_id = u.cliente_id and m.lado = 'out' and not m.eliminado
        and m.fecha > coalesce((select max(r.fecha) from public.mensajes r
                                 where r.cliente_id = u.cliente_id and r.lado = 'in' and r.autor is not null), '-infinity'))
  from ult u
$$;
revoke all on function public.resumen_chats() from public, anon;
grant execute on function public.resumen_chats() to authenticated;

-- ---------------------------------------------------------------------
-- 8 · Tiempo real (respeta las mismas políticas)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.chat_fijado, public.dudas, public.chat_lecturas;
  end if;
end $$;

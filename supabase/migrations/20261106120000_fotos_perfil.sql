-- =====================================================================
-- Fitnessindramas · fotos de perfil desde el servidor
--
-- Hasta ahora la foto de perfil se guardaba solo en el aparato de quien la ponía. Ahora:
--   · La foto del cliente la ven él, Domingo y Fátima (nunca otro cliente).
--   · Las de Domingo y Fátima las ven el equipo y sus clientes (en el chat).
--   · Cada uno solo pone, cambia o quita la suya.
-- Carpeta privada «perfiles» (foto cuadrada de la app: como mucho 300 KB), una subcarpeta por
-- cuenta: <user_id>/<nombre>.jpg. La tabla fotos_perfil dice cuál es la foto de cada uno; quitarla
-- es dejar la ruta vacía (nada se borra con DELETE desde la app). Las fotos que ya no usa nadie
-- las borra la limpieza diaria.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · Carpeta
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('perfiles', 'perfiles', false, 307200, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- ¿Es de Domingo o Fátima esta cuenta (por su id en texto)?
create function privado.cuenta_del_equipo(p_uid text) returns boolean
  language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.equipo e where e.user_id::text = p_uid) $$;
revoke all on function privado.cuenta_del_equipo(text) from public, anon;
grant execute on function privado.cuenta_del_equipo(text) to authenticated, service_role;

create or replace function privado.ruta_valida(p_carpeta text, p_ruta text) returns boolean
  language sql immutable set search_path = ''
as $$
  select case p_carpeta
    when 'fotos'    then p_ruta ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png|webp)$'
    when 'perfiles' then p_ruta ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png|webp)$'
    when 'audios'   then p_ruta ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-]{1,64}\.(webm|m4a|mp4|mp3|ogg|aac)$'
    else false end
$$;

-- el límite de subidas al día cuenta también las fotos de perfil
create or replace function privado.puede_subir() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select count(*) < 150 from storage.objects o
   where o.owner_id = (select auth.uid())::text
     and o.bucket_id in ('fotos', 'audios', 'perfiles')
     and o.created_at > now() - interval '1 day'
$$;

-- Subir: cada uno a su carpeta (equipo o cliente con acceso, también en el margen de impago)
create policy "perfiles: sube cada uno la suya" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'perfiles'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and privado.ruta_valida('perfiles', name)
    and (select privado.puede_subir())
    and ((select privado.es_equipo()) or (select privado.mi_cliente_limitado()) is not null)
  );
-- Ver: la suya; el equipo, todas; un cliente, también las del equipo
create policy "perfiles: la suya, el equipo todas, el cliente las del equipo" on storage.objects for select to authenticated
  using (
    bucket_id = 'perfiles'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select privado.es_equipo())
      or ((select privado.mi_cliente_limitado()) is not null and privado.cuenta_del_equipo((storage.foldername(name))[1]))
    )
  );
-- Borrar: solo la suya
create policy "perfiles: borra cada uno la suya" on storage.objects for delete to authenticated
  using (bucket_id = 'perfiles' and owner_id = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- 2 · Cuál es la foto de cada uno
-- ---------------------------------------------------------------------
create table public.fotos_perfil (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  cliente_id  uuid references public.clientes (id) on delete cascade,    -- si es de un cliente (lo pone el servidor)
  ruta        text check (char_length(ruta) <= 200),                   -- vacía = sin foto
  actualizado timestamptz not null default now()
);
create index fotos_perfil_cliente on public.fotos_perfil (cliente_id);

create function privado.preparar_foto_perfil() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  new.user_id := auth.uid();
  new.cliente_id := (select privado.mi_cliente_limitado());
  new.actualizado := now();
  if new.ruta is not null then
    if not privado.ruta_valida('perfiles', new.ruta) or split_part(new.ruta, '/', 1) <> auth.uid()::text then
      raise exception 'La foto no es válida' using errcode = '23514';
    end if;
    if not exists (select 1 from storage.objects o
                    where o.bucket_id = 'perfiles' and o.name = new.ruta and o.owner_id = auth.uid()::text) then
      raise exception 'La foto no se ha subido' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function privado.preparar_foto_perfil() from public, anon, authenticated;

create trigger preparar before insert or update on public.fotos_perfil
  for each row execute function privado.preparar_foto_perfil();

alter table public.fotos_perfil enable row level security;
revoke all on public.fotos_perfil from public, anon, authenticated;
-- update de user_id: lo pide el «upsert» de la API; el trigger lo vuelve a poner
grant select, insert (user_id, ruta), update (user_id, ruta) on public.fotos_perfil to authenticated;
grant all on public.fotos_perfil to service_role;

create policy "fotos perfil: la suya, el equipo todas, el cliente del equipo" on public.fotos_perfil for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select privado.es_equipo())
    or ((select privado.mi_cliente_limitado()) is not null and privado.cuenta_del_equipo(user_id::text))
  );
create policy "fotos perfil: cada uno pone la suya" on public.fotos_perfil for insert to authenticated
  with check (user_id = (select auth.uid()) and ((select privado.es_equipo()) or (select privado.mi_cliente_limitado()) is not null));
create policy "fotos perfil: cada uno cambia la suya" on public.fotos_perfil for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and ((select privado.es_equipo()) or (select privado.mi_cliente_limitado()) is not null));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.fotos_perfil;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3 · Limpieza diaria: también las fotos de perfil que ya no usa nadie
-- ---------------------------------------------------------------------
create or replace function public.archivos_sin_usar() returns table (carpeta text, ruta text)
  language sql stable security definer set search_path = ''
as $$
  select o.bucket_id, o.name from storage.objects o
   where o.bucket_id in ('fotos', 'audios', 'perfiles')
     and o.created_at < now() - interval '2 days'
     and not (o.bucket_id in ('fotos', 'audios') and exists (
               select 1 from public.mensajes m
                where m.archivo_ruta = o.name
                  and m.tipo = case o.bucket_id when 'fotos' then 'foto' else 'audio' end))
     and not (o.bucket_id = 'fotos' and exists (
               select 1 from public.seguimientos s, jsonb_array_elements(
                        case when jsonb_typeof(s.datos -> 'fotos') = 'array' then s.datos -> 'fotos' else '[]'::jsonb end) f
                where s.cliente_id::text = split_part(o.name, '/', 1) and f ->> 'ruta' = o.name))
     and not (o.bucket_id = 'perfiles' and exists (select 1 from public.fotos_perfil p where p.ruta = o.name))
   order by o.created_at
   limit 1000
$$;
revoke all on function public.archivos_sin_usar() from public, anon, authenticated;
grant execute on function public.archivos_sin_usar() to service_role;

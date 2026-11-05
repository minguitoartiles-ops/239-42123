-- =====================================================================
-- Fitnessindramas · paso 6: fotos y notas de voz desde el servidor
--
-- Las carpetas privadas ya existen (fase 4). Aquí se ajustan para usarlas de verdad:
--   1. Límites: fotos de hasta 5 MB (jpeg, png, webp) y notas de voz de hasta 3 MB
--      (2 minutos, en cualquier móvil). Nombres simples (<cliente_id>/<nombre>.<ext>) y,
--      como mucho, 150 subidas al día por persona: nadie puede llenar el almacén.
--   2. Mensajes con foto o nota de voz: el archivo tiene que existir, ser de ese chat y
--      haberlo subido quien envía el mensaje. La nota de voz lleva su duración (1-120 s).
--   3. Fotos de progreso en el seguimiento: hasta 3 (frente, perfil, espalda), de la carpeta
--      del propio cliente. Las ven el cliente, Domingo y Fátima (como el seguimiento).
--   4. Archivos sin usar (de un mensaje eliminado, una foto cambiada o una subida que no
--      llegó a enviarse): la limpieza diaria los borra pasados 2 días.
-- Nadie ve un archivo por un enlace: la app lo descarga con la sesión de cada persona.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · Límites de las carpetas y de las subidas
-- ---------------------------------------------------------------------
update storage.buckets set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'fotos';
update storage.buckets set file_size_limit = 3145728,
       allowed_mime_types = array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/aac']
 where id = 'audios';

-- ¿Es un nombre válido para esa carpeta? <cliente_id>/<nombre>.<extensión>
create function privado.ruta_valida(p_carpeta text, p_ruta text) returns boolean
  language sql immutable set search_path = ''
as $$
  select case p_carpeta
    when 'fotos'  then p_ruta ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png|webp)$'
    when 'audios' then p_ruta ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-]{1,64}\.(webm|m4a|mp4|mp3|ogg|aac)$'
    else false end
$$;

-- Subidas de fotos y notas de voz de esta persona en las últimas 24 horas (máximo 150)
create function privado.puede_subir() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select count(*) < 150 from storage.objects o
   where o.owner_id = (select auth.uid())::text
     and o.bucket_id in ('fotos', 'audios')
     and o.created_at > now() - interval '1 day'
$$;
revoke all on function privado.ruta_valida(text, text), privado.puede_subir() from public, anon;
grant execute on function privado.ruta_valida(text, text), privado.puede_subir() to authenticated, service_role;

drop policy "archivos: sube el equipo o su cliente" on storage.objects;
create policy "archivos: sube el equipo o su cliente" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('fotos', 'audios', 'documentos')
    and coalesce(array_length(storage.foldername(name), 1), 0) = 1
    and (bucket_id = 'documentos' or (privado.ruta_valida(bucket_id, name) and (select privado.puede_subir())))
    and (
      ((select privado.es_equipo())
        and exists (select 1 from public.clientes c where c.id::text = (storage.foldername(name))[1]))
      or (bucket_id in ('fotos', 'audios')
          and (storage.foldername(name))[1] = (select privado.mi_cliente_limitado())::text)
    )
  );

-- ---------------------------------------------------------------------
-- 2 · Mensajes con foto o nota de voz
-- ---------------------------------------------------------------------
alter table public.mensajes
  add column duracion smallint check (duracion between 1 and 120);    -- segundos de la nota de voz
grant insert (duracion) on public.mensajes to authenticated;

create function privado.archivo_mensaje() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  v_carpeta text := case new.tipo when 'foto' then 'fotos' when 'audio' then 'audios' end;
begin
  if new.tipo = 'texto' then
    if new.archivo_ruta is not null or new.duracion is not null then
      raise exception 'Un mensaje de texto no lleva archivo' using errcode = '23514';
    end if;
    return new;
  end if;
  if new.archivo_ruta is null or new.texto is not null then
    raise exception 'Una foto o nota de voz va sola, sin texto' using errcode = '23514';
  end if;
  if not privado.ruta_valida(v_carpeta, new.archivo_ruta) then
    raise exception 'El archivo no es válido' using errcode = '23514';
  end if;
  if (new.tipo = 'audio') <> (new.duracion is not null) then
    raise exception 'Solo la nota de voz lleva duración' using errcode = '23514';
  end if;
  -- el archivo existe y lo subió quien envía el mensaje (el servidor, sin sesión, no envía archivos)
  if not exists (select 1 from storage.objects o
                  where o.bucket_id = v_carpeta and o.name = new.archivo_ruta
                    and o.owner_id = (select auth.uid())::text) then
    raise exception 'El archivo no se ha subido' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function privado.archivo_mensaje() from public, anon, authenticated;

-- «ver_archivo»: después de «preparar» (que ya comprueba que el archivo es de la carpeta de ese chat)
create trigger ver_archivo before insert on public.mensajes for each row execute function privado.archivo_mensaje();

-- ---------------------------------------------------------------------
-- 3 · Fotos de progreso en el seguimiento
--     datos.fotos = [{ "pos": "frente" | "perfil" | "espalda", "ruta": "<cliente_id>/<nombre>.jpg" }]
-- ---------------------------------------------------------------------
create function privado.fotos_seguimiento() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  f jsonb;
  v_pos text[] := '{}';
begin
  if not (new.datos ? 'fotos') then
    return new;
  end if;
  if jsonb_typeof(new.datos -> 'fotos') <> 'array' or jsonb_array_length(new.datos -> 'fotos') > 3 then
    raise exception 'Como mucho tres fotos de progreso' using errcode = '23514';
  end if;
  for f in select * from jsonb_array_elements(new.datos -> 'fotos') loop
    if jsonb_typeof(f) <> 'object' or (select count(*) from jsonb_object_keys(f)) <> 2
       or not (f ->> 'pos' = any (array['frente', 'perfil', 'espalda'])) or f ->> 'pos' = any (v_pos)
       or not privado.ruta_valida('fotos', coalesce(f ->> 'ruta', ''))
       or split_part(f ->> 'ruta', '/', 1) <> new.cliente_id::text then
      raise exception 'Las fotos de progreso no son válidas' using errcode = '23514';
    end if;
    v_pos := v_pos || (f ->> 'pos');
    if auth.uid() is not null and not exists (
         select 1 from storage.objects o where o.bucket_id = 'fotos' and o.name = f ->> 'ruta') then
      raise exception 'Alguna foto de progreso no se ha subido' using errcode = '23514';
    end if;
  end loop;
  return new;
end $$;
revoke all on function privado.fotos_seguimiento() from public, anon, authenticated;

create trigger fotos before insert or update on public.seguimientos for each row execute function privado.fotos_seguimiento();

-- ---------------------------------------------------------------------
-- 4 · Archivos sin usar, para la limpieza diaria (solo la llama el servidor)
-- ---------------------------------------------------------------------
create function public.archivos_sin_usar() returns table (carpeta text, ruta text)
  language sql stable security definer set search_path = ''
as $$
  select o.bucket_id, o.name from storage.objects o
   where o.bucket_id in ('fotos', 'audios')
     and o.created_at < now() - interval '2 days'
     and not exists (select 1 from public.mensajes m
                      where m.archivo_ruta = o.name
                        and m.tipo = case o.bucket_id when 'fotos' then 'foto' else 'audio' end)
     and not (o.bucket_id = 'fotos' and exists (
               select 1 from public.seguimientos s, jsonb_array_elements(
                        case when jsonb_typeof(s.datos -> 'fotos') = 'array' then s.datos -> 'fotos' else '[]'::jsonb end) f
                where s.cliente_id::text = split_part(o.name, '/', 1) and f ->> 'ruta' = o.name))
   order by o.created_at
   limit 1000
$$;
revoke all on function public.archivos_sin_usar() from public, anon, authenticated;
grant execute on function public.archivos_sin_usar() to service_role;

create index mensajes_archivo on public.mensajes (archivo_ruta) where archivo_ruta is not null;

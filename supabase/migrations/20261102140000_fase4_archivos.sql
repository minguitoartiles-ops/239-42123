-- =====================================================================
-- Fitnessindramas · fase 4: archivos privados (Supabase Storage)
--
-- Tres carpetas privadas. Cada archivo vive en <cliente_id>/<nombre>, sin subcarpetas.
--   fotos ....... imágenes del chat y fotos de progreso (10 MB, jpeg/png/webp/gif)
--   audios ...... notas de voz del chat (10 MB)
--   documentos .. PDF de Fátima para cada cliente (20 MB, solo PDF)
-- Nadie sobrescribe archivos (no hay política de update). Para verlos, la app pide
-- enlaces firmados de pocos minutos.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('fotos',      'fotos',      false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('audios',     'audios',     false, 10485760, array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/aac']),
  ('documentos', 'documentos', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Ver: el equipo, todo; el cliente, lo suyo (fotos y audios también durante el margen de impago, por el chat)
create policy "archivos: ve el equipo o su cliente" on storage.objects for select to authenticated
  using (
    bucket_id in ('fotos', 'audios', 'documentos')
    and (
      (select privado.es_equipo())
      or (bucket_id in ('fotos', 'audios')
          and (storage.foldername(name))[1] = (select privado.mi_cliente_limitado())::text)
      or (bucket_id = 'documentos'
          and (storage.foldername(name))[1] = (select privado.mi_cliente())::text)
    )
  );

-- Subir: el equipo, a la carpeta de un cliente que exista; el cliente, fotos y audios a la suya
create policy "archivos: sube el equipo o su cliente" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('fotos', 'audios', 'documentos')
    and coalesce(array_length(storage.foldername(name), 1), 0) = 1
    and (
      ((select privado.es_equipo())
        and exists (select 1 from public.clientes c where c.id::text = (storage.foldername(name))[1]))
      or (bucket_id in ('fotos', 'audios')
          and (storage.foldername(name))[1] = (select privado.mi_cliente_limitado())::text)
    )
  );

-- Borrar: quien lo subió, o el equipo
create policy "archivos: borra quien lo subió o el equipo" on storage.objects for delete to authenticated
  using (
    bucket_id in ('fotos', 'audios', 'documentos')
    and (owner_id = (select auth.uid())::text or (select privado.es_equipo()))
  );

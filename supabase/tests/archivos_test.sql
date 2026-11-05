-- =====================================================================
-- Pruebas del paso 6: fotos y notas de voz · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'ana@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'beto@prueba.local');
insert into public.equipo (user_id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador');
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'Ana', current_date + 30),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'Beto', current_date + 30);

-- límites de las carpetas
select results_eq($$ select id, file_size_limit, public from storage.buckets where id in ('fotos', 'audios') order by id $$,
  $$ values ('audios'::text, 3145728::bigint, false), ('fotos'::text, 5242880::bigint, false) $$,
  'Fotos hasta 5 MB y notas de voz hasta 3 MB, y las carpetas siguen siendo privadas');
select ok((select not ('image/gif' = any (allowed_mime_types)) from storage.buckets where id = 'fotos'), 'Solo jpeg, png o webp');

-- ---------- Ana (cliente): subir ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('fotos', '00000000-0000-0000-0000-0000000000ca/f1.jpg', '00000000-0000-0000-0000-0000000000a1'),
  ('fotos', '00000000-0000-0000-0000-0000000000ca/p1.jpg', '00000000-0000-0000-0000-0000000000a1'),
  ('audios', '00000000-0000-0000-0000-0000000000ca/v1.webm', '00000000-0000-0000-0000-0000000000a1') $$,
  'Sube fotos y una nota de voz a su carpeta');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('fotos', '00000000-0000-0000-0000-0000000000ca/mi foto.jpg') $$,
  '42501', null, 'Nombres raros, no');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('audios', '00000000-0000-0000-0000-0000000000ca/x.jpg') $$,
  '42501', null, 'Una imagen no va a la carpeta de audios');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('fotos', '00000000-0000-0000-0000-0000000000ca/x.svg') $$,
  '42501', null, 'Ni otros tipos de archivo');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('fotos', '00000000-0000-0000-0000-0000000000cb/x.jpg') $$,
  '42501', null, 'No sube a la carpeta de otro');

-- ---------- Ana: mensajes con archivo ----------
select lives_ok($$ insert into public.mensajes (cliente_id, lado, tipo, archivo_ruta)
  values ('00000000-0000-0000-0000-0000000000ca', 'out', 'foto', '00000000-0000-0000-0000-0000000000ca/f1.jpg') $$,
  'Envía una foto que ha subido');
select lives_ok($$ insert into public.mensajes (cliente_id, lado, tipo, archivo_ruta, duracion)
  values ('00000000-0000-0000-0000-0000000000ca', 'out', 'audio', '00000000-0000-0000-0000-0000000000ca/v1.webm', 42) $$,
  'Envía una nota de voz con su duración');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, tipo, archivo_ruta)
  values ('00000000-0000-0000-0000-0000000000ca', 'out', 'foto', '00000000-0000-0000-0000-0000000000ca/nada.jpg') $$,
  '23514', null, 'No envía una foto que no existe');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, tipo, archivo_ruta)
  values ('00000000-0000-0000-0000-0000000000ca', 'out', 'audio', '00000000-0000-0000-0000-0000000000ca/v1.webm') $$,
  '23514', null, 'La nota de voz lleva duración');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, tipo, archivo_ruta, duracion)
  values ('00000000-0000-0000-0000-0000000000ca', 'out', 'audio', '00000000-0000-0000-0000-0000000000ca/v1.webm', 121) $$,
  '23514', null, 'Como mucho 2 minutos');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, tipo, archivo_ruta, texto)
  values ('00000000-0000-0000-0000-0000000000ca', 'out', 'foto', '00000000-0000-0000-0000-0000000000ca/f1.jpg', '<b>hola</b>') $$,
  '23514', null, 'Una foto no lleva texto');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, tipo, texto, archivo_ruta)
  values ('00000000-0000-0000-0000-0000000000ca', 'out', 'texto', 'hola', '00000000-0000-0000-0000-0000000000ca/f1.jpg') $$,
  '23514', null, 'Un texto no lleva archivo');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, tipo, archivo_ruta)
  values ('00000000-0000-0000-0000-0000000000ca', 'out', 'foto', '00000000-0000-0000-0000-0000000000ca/v1.webm') $$,
  '23514', null, 'Una nota de voz no se envía como foto');

-- ---------- Ana: fotos de progreso ----------
select lives_ok($$ insert into public.seguimientos (id, cliente_id, fecha, datos) values ('00000000-0000-0000-0000-0000000005a1',
  '00000000-0000-0000-0000-0000000000ca', current_date, '{"peso": "79", "fotos": [{"pos": "frente", "ruta": "00000000-0000-0000-0000-0000000000ca/p1.jpg"}]}') $$,
  'Envía su seguimiento con una foto de progreso');
select throws_ok($$ update public.seguimientos set datos = '{"fotos": [{"pos": "frente", "ruta": "00000000-0000-0000-0000-0000000000ca/p1.jpg"}, {"pos": "frente", "ruta": "00000000-0000-0000-0000-0000000000ca/f1.jpg"}]}'
  where id = '00000000-0000-0000-0000-0000000005a1' $$, '23514', null, 'Una foto por posición');
select throws_ok($$ update public.seguimientos set datos = '{"fotos": [{"pos": "frente", "ruta": "00000000-0000-0000-0000-0000000000cb/p1.jpg"}]}'
  where id = '00000000-0000-0000-0000-0000000005a1' $$, '23514', null, 'Solo fotos de su carpeta');
select throws_ok($$ update public.seguimientos set datos = '{"fotos": [{"pos": "frente", "ruta": "00000000-0000-0000-0000-0000000000ca/nada.jpg"}]}'
  where id = '00000000-0000-0000-0000-0000000005a1' $$, '23514', null, 'Solo fotos que existen');
select throws_ok($$ update public.seguimientos set datos = '{"fotos": [{"pos": "frente", "ruta": "00000000-0000-0000-0000-0000000000ca/p1.jpg", "src": "javascript:x"}]}'
  where id = '00000000-0000-0000-0000-0000000005a1' $$, '23514', null, 'Sin datos de más');
select throws_ok($$ update public.seguimientos set datos = '{"fotos": [{"pos": "frente", "ruta": "a"}, {"pos": "perfil", "ruta": "b"}, {"pos": "espalda", "ruta": "c"}, {"pos": "x", "ruta": "d"}]}'
  where id = '00000000-0000-0000-0000-0000000005a1' $$, '23514', null, 'Como mucho tres');
select lives_ok($$ update public.seguimientos set datos = '{"peso": "79"}' where id = '00000000-0000-0000-0000-0000000005a1' $$,
  'Quitar las fotos sí puede');
select throws_ok($$ select * from public.archivos_sin_usar() $$, '42501', null, 'La lista de archivos sin usar no es para la app');
reset role;

-- ---------- Beto: una foto de Ana no le sirve ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ select 1 from storage.objects where name like '00000000-0000-0000-0000-0000000000ca/%' $$, 'No ve los archivos de Ana');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, tipo, archivo_ruta)
  values ('00000000-0000-0000-0000-0000000000cb', 'out', 'foto', '00000000-0000-0000-0000-0000000000ca/f1.jpg') $$,
  '42501', null, 'No puede enviar a su chat una foto de Ana');
reset role;

-- ---------- Domingo ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select count(*)::int from storage.objects where name like '00000000-0000-0000-0000-0000000000ca/%' $$,
  $$ values (3) $$, 'Ve las fotos y notas de voz de Ana (también las de progreso)');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('audios', '00000000-0000-0000-0000-0000000000ca/d1.m4a', '00000000-0000-0000-0000-0000000000d1') $$,
  'Sube una nota de voz al chat de Ana');
select lives_ok($$ insert into public.mensajes (cliente_id, lado, tipo, archivo_ruta, duracion)
  values ('00000000-0000-0000-0000-0000000000ca', 'in', 'audio', '00000000-0000-0000-0000-0000000000ca/d1.m4a', 120) $$,
  'Y la envía');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, tipo, archivo_ruta)
  values ('00000000-0000-0000-0000-0000000000ca', 'in', 'foto', '00000000-0000-0000-0000-0000000000ca/f1.jpg') $$,
  '23514', null, 'No reenvía como suya una foto que subió Ana');
reset role;

-- ---------- Límite de subidas al día ----------
insert into storage.objects (bucket_id, name, owner_id)
select 'fotos', '00000000-0000-0000-0000-0000000000cb/n' || g || '.jpg', '00000000-0000-0000-0000-0000000000b1' from generate_series(1, 150) g;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('fotos', '00000000-0000-0000-0000-0000000000cb/otra.jpg', '00000000-0000-0000-0000-0000000000b1') $$,
  '42501', null, 'Tras 150 subidas en un día, no sube más');
reset role;
update storage.objects set created_at = now() - interval '25 hours' where owner_id = '00000000-0000-0000-0000-0000000000b1';
set local role authenticated;
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('fotos', '00000000-0000-0000-0000-0000000000cb/otra.jpg', '00000000-0000-0000-0000-0000000000b1') $$,
  'Al día siguiente, sí');
reset role;

-- ---------- Archivos sin usar (limpieza diaria) ----------
set local request.jwt.claims = '';
set local storage.allow_delete_query = 'true';   -- Supabase solo deja borrar por SQL con este permiso
delete from storage.objects where owner_id = '00000000-0000-0000-0000-0000000000b1';
insert into storage.objects (bucket_id, name, owner_id) values
  ('fotos', '00000000-0000-0000-0000-0000000000ca/suelta.jpg', '00000000-0000-0000-0000-0000000000a1'),
  ('fotos', '00000000-0000-0000-0000-0000000000ca/reciente.jpg', '00000000-0000-0000-0000-0000000000a1');
update public.seguimientos set datos = '{"fotos": [{"pos": "perfil", "ruta": "00000000-0000-0000-0000-0000000000ca/p1.jpg"}]}'
 where id = '00000000-0000-0000-0000-0000000005a1';
update storage.objects set created_at = now() - interval '3 days' where name not like '%reciente.jpg';
select results_eq($$ select carpeta, ruta from public.archivos_sin_usar() order by ruta $$,
  $$ values ('fotos'::text, '00000000-0000-0000-0000-0000000000ca/suelta.jpg'::text) $$,
  'Solo lo que no usa ningún mensaje ni seguimiento, y con más de 2 días');
update public.mensajes set eliminado = true, archivo_ruta = null where archivo_ruta like '%/f1.jpg';
select results_eq($$ select ruta from public.archivos_sin_usar() order by ruta $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca/f1.jpg'::text), ('00000000-0000-0000-0000-0000000000ca/suelta.jpg'::text) $$,
  'La foto de un mensaje eliminado pasa a la lista');
update public.seguimientos set datos = '{}' where id = '00000000-0000-0000-0000-0000000005a1';
select ok((select count(*) = 3 from public.archivos_sin_usar()), 'Y la foto de progreso que se quita, también');

select * from finish();
rollback;

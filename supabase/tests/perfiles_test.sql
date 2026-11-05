-- =====================================================================
-- Pruebas de las fotos de perfil · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'fatima@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'ana@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'beto@prueba.local'),
  ('00000000-0000-0000-0000-0000000000e1', 'eva@prueba.local');
insert into public.equipo (user_id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador'),
  ('00000000-0000-0000-0000-0000000000f1', 'Fátima', 'dietista');
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'Ana', current_date + 30),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'Beto', current_date + 30);
-- Eva tiene cuenta pero no es cliente ni del equipo

select results_eq($$ select public, file_size_limit from storage.buckets where id = 'perfiles' $$,
  $$ values (false, 307200::bigint) $$, 'Carpeta privada, fotos de como mucho 300 KB');

-- ---------- Ana (cliente) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('perfiles', '00000000-0000-0000-0000-0000000000a1/yo.jpg', '00000000-0000-0000-0000-0000000000a1') $$, 'Sube su foto a su carpeta');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('perfiles', '00000000-0000-0000-0000-0000000000b1/yo.jpg', '00000000-0000-0000-0000-0000000000a1') $$, '42501', null, 'No sube a la carpeta de otro');
select lives_ok($$ insert into public.fotos_perfil (ruta) values ('00000000-0000-0000-0000-0000000000a1/yo.jpg') $$, 'La pone como su foto');
select results_eq($$ select user_id, cliente_id from public.fotos_perfil $$,
  $$ values ('00000000-0000-0000-0000-0000000000a1'::uuid, '00000000-0000-0000-0000-0000000000ca'::uuid) $$, 'De quién es y de qué cliente lo pone el servidor');
select throws_ok($$ update public.fotos_perfil set ruta = '00000000-0000-0000-0000-0000000000a1/nada.jpg' $$,
  '23514', null, 'Solo una foto que ha subido');
select throws_ok($$ update public.fotos_perfil set ruta = '00000000-0000-0000-0000-0000000000b1/yo.jpg' $$,
  '23514', null, 'Ni una de otra carpeta');
reset role;

-- Beto sube la suya; Domingo también (como servidor)
set local request.jwt.claims = '';
insert into storage.objects (bucket_id, name, owner_id) values
  ('perfiles', '00000000-0000-0000-0000-0000000000b1/yo.jpg', '00000000-0000-0000-0000-0000000000b1'),
  ('perfiles', '00000000-0000-0000-0000-0000000000d1/yo.jpg', '00000000-0000-0000-0000-0000000000d1');
insert into public.fotos_perfil (user_id, cliente_id, ruta) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1/yo.jpg'),
  ('00000000-0000-0000-0000-0000000000d1', null, '00000000-0000-0000-0000-0000000000d1/yo.jpg');

-- ---------- Ana: qué ve ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select user_id from public.fotos_perfil order by user_id $$,
  $$ values ('00000000-0000-0000-0000-0000000000a1'::uuid), ('00000000-0000-0000-0000-0000000000d1'::uuid) $$,
  'Ve la suya y la de Domingo, no la de Beto');
select results_eq($$ select name from storage.objects where bucket_id = 'perfiles' order by name $$,
  $$ values ('00000000-0000-0000-0000-0000000000a1/yo.jpg'::text), ('00000000-0000-0000-0000-0000000000d1/yo.jpg'::text) $$,
  'Y puede descargar la suya y la de Domingo, no la de Beto');
select is_empty($$ update public.fotos_perfil set ruta = null where user_id = '00000000-0000-0000-0000-0000000000d1' returning 1 $$,
  'No quita la foto de Domingo');
select lives_ok($$ update public.fotos_perfil set ruta = null $$, 'Quita la suya');
select results_eq($$ select ruta from public.fotos_perfil where user_id = '00000000-0000-0000-0000-0000000000a1' $$,
  $$ values (null::text) $$, 'Sin foto');
set local storage.allow_delete_query = 'true';
select is_empty($$ delete from storage.objects where name like '00000000-0000-0000-0000-0000000000d1/%' returning 1 $$, 'No borra el archivo de Domingo');
reset role;

-- ---------- Domingo ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.fotos_perfil $$, $$ values (3) $$, 'Domingo ve las de todos');
select results_eq($$ select count(*)::int from storage.objects where bucket_id = 'perfiles' $$, $$ values (3) $$, 'Y las puede descargar');
select is_empty($$ update public.fotos_perfil set ruta = null where user_id = '00000000-0000-0000-0000-0000000000b1' returning 1 $$,
  'No quita la foto de un cliente');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('perfiles', '00000000-0000-0000-0000-0000000000b1/otra.jpg', '00000000-0000-0000-0000-0000000000d1') $$, '42501', null, 'Ni sube a su carpeta');
reset role;

-- ---------- Fátima ve la foto de Domingo ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select ok((select count(*) = 3 from public.fotos_perfil), 'Fátima también ve las de todos');
reset role;

-- ---------- Eva (sin ficha ni equipo) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ select 1 from public.fotos_perfil $$, 'Una cuenta sin ficha no ve ninguna');
select is_empty($$ select 1 from storage.objects where bucket_id = 'perfiles' $$, 'Ni descarga ninguna');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner_id) values
  ('perfiles', '00000000-0000-0000-0000-0000000000e1/yo.jpg', '00000000-0000-0000-0000-0000000000e1') $$, '42501', null, 'Ni sube');
reset role;

-- ---------- Limpieza ----------
set local request.jwt.claims = '';
update storage.objects set created_at = now() - interval '3 days';
select results_eq($$ select carpeta, ruta from public.archivos_sin_usar() $$,
  $$ values ('perfiles'::text, '00000000-0000-0000-0000-0000000000a1/yo.jpg'::text) $$,
  'La foto que Ana quitó pasa a la limpieza; las que se usan, no');
select throws_ok($$ select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
  set local role authenticated; select * from public.archivos_sin_usar() $$, '42501', null, 'La lista es solo para el servidor');

select * from finish();
rollback;

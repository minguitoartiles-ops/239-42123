-- =====================================================================
-- Pruebas de la auditoría de seguridad del 11/11/2026 · supabase test db
--   · registro de actividad: se apunta solo, no se toca, lo lee solo el administrador
--   · roles y permisos: administrador, suspensión, siempre un administrador
--   · verificación en dos pasos: sin el segundo paso no se ve nada
--   · consentimiento de cookies en el servidor
--   · derechos RGPD del cliente
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(49);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'fatima@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@prueba.local');
insert into public.equipo (user_id, nombre, rol, admin) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador', true),
  ('00000000-0000-0000-0000-0000000000f1', 'Fátima', 'dietista', false);
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'A', current_date + 30),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'B', current_date + 30);
insert into public.salud (cliente_id) values ('00000000-0000-0000-0000-0000000000ca');

-- ---------------------------------------------------------------------
-- 1 · Registro de actividad
-- ---------------------------------------------------------------------
select ok((select count(*) from privado.registro where tabla = 'clientes' and accion = 'alta' and rol = 'sistema') = 2,
  'Las altas hechas por el sistema quedan apuntadas');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ update public.clientes set acceso_hasta = current_date + 60, objetivo = 'Fuerza' where id = '00000000-0000-0000-0000-0000000000ca' $$,
  'Domingo cambia el acceso de A');
reset role;
select results_eq(
  $$ select quien, rol, accion, cliente_id, campos, detalle -> 'acceso_hasta' ? 'antes' from privado.registro where tabla = 'clientes' and accion = 'cambio' $$,
  $$ values ('00000000-0000-0000-0000-0000000000d1'::uuid, 'entrenador', 'cambio', '00000000-0000-0000-0000-0000000000ca'::uuid,
             array['acceso_hasta', 'objetivo'], true) $$,
  'Queda quién, con qué rol, de qué cliente, qué campos y el acceso de antes y de ahora');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ update public.salud set datos = '{"alergias": {"items": {"leche": "diag"}}}' $$, 'A rellena sus alergias');
reset role;
select results_eq(
  $$ select rol, campos, detalle from privado.registro where tabla = 'salud' and accion = 'cambio' $$,
  $$ values ('cliente', array['datos.alergias'], null::jsonb) $$,
  'De la salud se apunta el apartado, nunca el contenido');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ select * from privado.registro $$, '42501', null, 'Un cliente no lee el registro directamente');
select throws_ok($$ select * from public.registro_actividad() $$, '42501', null, 'Ni con la función');
select lives_ok($$ select public.apuntar_descarga('mis_datos') $$, 'El cliente apunta que descarga sus datos');
select throws_ok($$ select public.apuntar_descarga('copia_completa') $$, '42501', null, 'Pero no una copia completa');
reset role;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ select * from public.registro_actividad() $$, '42501', null, 'Fátima no administra: no lo ve');
reset role;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select ok((select count(*) from public.registro_actividad()) >= 5, 'El administrador ve el registro');
select results_eq(
  $$ select quien_nombre, cliente_nombre from public.registro_actividad(p_accion => 'descarga_mis_datos') $$,
  $$ values ('A', 'A') $$, 'Con los nombres de quién y de qué cliente');
select results_eq(
  $$ select count(*)::int from public.registro_actividad(p_cliente => '00000000-0000-0000-0000-0000000000cb') $$,
  $$ values (1) $$, 'Se filtra por cliente');
reset role;

select throws_ok($$ update privado.registro set accion = 'otra' $$, '42501', null, 'El registro no se cambia (ni siquiera el dueño de la base de datos)');
select throws_ok($$ delete from privado.registro $$, '42501', null, 'Ni se borra');
select throws_ok($$ truncate privado.registro $$, '42501', null, 'Ni se vacía');
insert into privado.registro (fecha, rol, accion) values (now() - interval '3 years', 'sistema', 'antiguo');
select lives_ok($$ delete from privado.registro where accion = 'antiguo' $$, 'Lo de más de 2 años sí se borra');

-- ---------------------------------------------------------------------
-- 2 · Inicios de sesión y cuenta
-- ---------------------------------------------------------------------
select lives_ok($$ insert into auth.sessions (id, user_id, created_at, updated_at) values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', now(), now()) $$,
  'A inicia sesión');
select results_eq($$ select rol, cliente_id from privado.registro where accion = 'inicio_sesion' $$,
  $$ values ('cliente', '00000000-0000-0000-0000-0000000000ca'::uuid) $$, 'El inicio de sesión queda apuntado');

-- ---------------------------------------------------------------------
-- 3 · Roles y permisos
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select nombre, rol, admin, activo from public.permisos_equipo() $$,
  $$ values ('Domingo', 'entrenador', true, true), ('Fátima', 'dietista', false, true) $$, 'El equipo ve quién tiene cada rol');
select throws_ok($$ select public.cambiar_permisos('00000000-0000-0000-0000-0000000000f1', 'dietista', true, true) $$,
  '42501', null, 'Fátima no se da la administración');
reset role;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ select * from public.permisos_equipo() $$, 'Un cliente no ve los permisos del equipo');
reset role;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ select public.cambiar_permisos('00000000-0000-0000-0000-0000000000d1', 'entrenador', false, true) $$,
  '42501', null, 'El administrador no se quita a sí mismo la administración');
select throws_ok($$ select public.cambiar_permisos('00000000-0000-0000-0000-0000000000d1', 'entrenador', true, false) $$,
  '42501', null, 'Ni se suspende');
select throws_ok($$ select public.cambiar_permisos('00000000-0000-0000-0000-0000000000f1', 'jefa', false, true) $$,
  '22023', null, 'Un rol inventado, no');
select lives_ok($$ select public.cambiar_permisos('00000000-0000-0000-0000-0000000000f1', 'dietista', false, false) $$,
  'Domingo suspende a Fátima');
reset role;
select results_eq($$ select quien, detalle -> 'activo' from privado.registro where tabla = 'equipo' and accion = 'cambio' $$,
  $$ values ('00000000-0000-0000-0000-0000000000d1'::uuid, '{"antes": true, "ahora": false}'::jsonb) $$,
  'El cambio de permisos queda apuntado');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ select 1 from public.clientes $$, 'Suspendida, Fátima no ve ningún cliente');
select is_empty($$ select 1 from public.salud $$, 'Ni su salud');
select throws_ok($$ insert into public.planes_nutricion (cliente_id) values ('00000000-0000-0000-0000-0000000000cb') $$,
  '42501', null, 'Ni crea planes');
reset role;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ select public.cambiar_permisos('00000000-0000-0000-0000-0000000000f1', 'dietista', false, true) $$,
  'Y la vuelve a activar');
reset role;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.clientes $$, $$ values (2) $$, 'Activa otra vez, lo ve todo');
reset role;

-- ---------------------------------------------------------------------
-- 4 · Verificación en dos pasos
-- ---------------------------------------------------------------------
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000d1', 'Móvil', 'totp', 'unverified', now(), now());
update auth.mfa_factors set status = 'verified' where id = '00000000-0000-0000-0000-00000000f001';
select ok(exists (select 1 from privado.registro where accion = 'dos_pasos_activado' and quien = '00000000-0000-0000-0000-0000000000d1'),
  'Activar los dos pasos queda apuntado');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated", "aal": "aal1"}';
set local role authenticated;
select is_empty($$ select 1 from public.clientes $$, 'Con los dos pasos activados, una sesión de un solo paso no ve nada');
select ok(not (select public.soy_equipo()), 'Ni cuenta como equipo');
reset role;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated", "aal": "aal2"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.clientes $$, $$ values (2) $$, 'Con el segundo paso superado, sí');
select results_eq($$ select nombre, dos_pasos from public.permisos_equipo() where admin $$, $$ values ('Domingo', true) $$,
  'La lista de permisos dice quién tiene los dos pasos');
reset role;

-- ---------------------------------------------------------------------
-- 5 · Consentimiento de cookies
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.consentimientos (tipo, estado, version, detalle) values ('cookies', 'dado', '2026-11-11', '{"todo": "raro"}') $$,
  'A acepta las cookies');
reset role;
select results_eq($$ select cliente_id, detalle from public.consentimientos where tipo = 'cookies' $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca'::uuid, '{"preferencias": true}'::jsonb) $$,
  'Queda en el servidor, con su ficha y solo lo que significa');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.consentimientos (tipo, estado, version) values ('cookies', 'retirado', '2026-11-11') $$,
  'Fátima rechaza las de preferencias (también queda)');
select throws_ok($$ insert into public.consentimientos (tipo, estado, version) values ('salud', 'dado', '2026-11-11') $$,
  '42501', null, 'Pero el equipo no da consentimientos de salud');
reset role;

-- ---------------------------------------------------------------------
-- 6 · Derechos RGPD
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.solicitudes_derechos (tipo, detalle) values ('rectificacion', ' Mi altura es 1,80 ') $$,
  'A pide corregir un dato');
select results_eq($$ select cliente_id, estado, detalle, plazo from public.solicitudes_derechos $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca'::uuid, 'pendiente', 'Mi altura es 1,80', (current_date + interval '1 month')::date) $$,
  'Queda pendiente, de su ficha y con el plazo de un mes');
select throws_ok($$ insert into public.solicitudes_derechos (tipo) values ('venganza') $$, '23514', null, 'Solo los derechos de la ley');
update public.solicitudes_derechos set estado = 'resuelta';
select results_eq($$ select estado from public.solicitudes_derechos $$, $$ values ('pendiente') $$, 'El cliente no la da por resuelta');
reset role;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ select 1 from public.solicitudes_derechos $$, 'Otro cliente no la ve');
reset role;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ update public.solicitudes_derechos set estado = 'denegada' $$, '23514', null, 'Para denegarla hay que explicar el motivo');
select lives_ok($$ update public.solicitudes_derechos set estado = 'resuelta', respuesta = 'Corregido en tu ficha' $$, 'Fátima la resuelve');
select results_eq($$ select resuelta_por, resuelta_en is not null from public.solicitudes_derechos $$,
  $$ values ('00000000-0000-0000-0000-0000000000f1'::uuid, true) $$, 'Queda quién y cuándo la resolvió');
reset role;

select * from finish();
rollback;

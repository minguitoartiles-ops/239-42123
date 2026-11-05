-- =====================================================================
-- Pruebas de permisos (pgTAP) · se ejecutan con: supabase test db
-- Cada prueba se hace con la identidad de una persona concreta y comprueba
-- lo que puede y lo que NO puede hacer. Todo se deshace al final (rollback).
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(68);

-- ---------------------------------------------------------------------
-- Datos de prueba (como administrador)
-- ---------------------------------------------------------------------
--   Domingo  (entrenador)       ...00d1
--   Fátima   (dietista)         ...00f1
--   Cliente A  usuario ...00a1  ficha ...00ca
--   Cliente B  usuario ...00b1  ficha ...00cb
--   Cliente C  usuario ...00c1  ficha ...00cc  (de baja)
--   Usuario E  usuario ...00e1  (tiene cuenta, pero ninguna ficha)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'fatima@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@prueba.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'c@prueba.local'),
  ('00000000-0000-0000-0000-0000000000e1', 'e@prueba.local');

insert into public.equipo (user_id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador'),
  ('00000000-0000-0000-0000-0000000000f1', 'Fátima', 'dietista');

insert into public.clientes (id, user_id, nombre) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'Cliente A'),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'Cliente B'),
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-0000000000c1', 'Cliente C');
update public.clientes set estado = 'baja' where id = '00000000-0000-0000-0000-0000000000cc';

insert into public.salud (cliente_id, datos) values
  ('00000000-0000-0000-0000-0000000000ca', '{"alergias": "ninguna"}'),
  ('00000000-0000-0000-0000-0000000000cb', '{"alergias": "frutos secos"}');
insert into public.planes_entreno (cliente_id) values
  ('00000000-0000-0000-0000-0000000000ca'), ('00000000-0000-0000-0000-0000000000cb');
insert into public.planes_nutricion (cliente_id) values
  ('00000000-0000-0000-0000-0000000000ca'), ('00000000-0000-0000-0000-0000000000cb');
insert into public.seguimientos (id, cliente_id, fecha, datos) values
  ('00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-0000000000ca', current_date - 14, '{"peso": 80}');
insert into public.mensajes (id, cliente_id, autor, lado, texto) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000d1', 'in',  'Hola A'),
  ('00000000-0000-0000-0000-0000000001b1', '00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'out', 'Soy B'),
  ('00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-0000000000c1', 'out', 'Soy C');
insert into public.pagos (cliente_id, importe, metodo) values
  ('00000000-0000-0000-0000-0000000000ca', 50, 'bizum'),
  ('00000000-0000-0000-0000-0000000000cb', 50, 'bizum');
update public.config_pagos set bizum = '{"+34600000000"}';

-- ---------------------------------------------------------------------
-- 1 · Estructura
-- ---------------------------------------------------------------------
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public', 'privado') and c.relkind = 'r' and not c.relrowsecurity $$,
  'Ninguna tabla sin RLS');
select is_empty(
  $$ select table_name from information_schema.role_table_grants
     where grantee = 'anon' and table_schema in ('public', 'privado') $$,
  'Los visitantes sin sesión (anon) no tienen ningún permiso sobre tablas');
select is_empty(
  $$ select table_name from information_schema.column_privileges
     where grantee = 'anon' and table_schema in ('public', 'privado') $$,
  'Los visitantes sin sesión (anon) no tienen permisos sobre columnas');
select ok(not has_function_privilege('anon', 'privado.es_equipo()', 'execute'),
  'Los visitantes sin sesión no pueden usar las funciones internas');
select is_empty(
  $$ select table_name from information_schema.role_table_grants
     where grantee = 'authenticated' and table_schema = 'public'
       and privilege_type in ('DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
       and table_name <> 'catalogo' $$,
  'Nadie con sesión puede borrar datos (salvo el catálogo propio del equipo)');

-- ---------------------------------------------------------------------
-- 2 · Visitante sin sesión
-- ---------------------------------------------------------------------
set local role anon;
select throws_ok($$ select * from public.clientes $$, '42501', null,
  'Sin sesión no se puede leer ningún cliente');
select throws_ok($$ select * from public.config_pagos $$, '42501', null,
  'Sin sesión no se ven los datos de pago');
reset role;

-- ---------------------------------------------------------------------
-- 3 · Cliente A
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;

select results_eq($$ select id from public.clientes $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca'::uuid) $$,
  'El cliente A solo ve su propia ficha');
select results_eq($$ select cliente_id from public.salud $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca'::uuid) $$,
  'El cliente A solo ve sus datos de salud');
select is_empty($$ update public.salud set datos = '{"x": 1}'
                   where cliente_id = '00000000-0000-0000-0000-0000000000cb' returning 1 $$,
  'El cliente A no puede cambiar los datos de salud de B');
select lives_ok($$ update public.salud set datos = '{"alergias": "lactosa"}'
                   where cliente_id = '00000000-0000-0000-0000-0000000000ca' $$,
  'El cliente A puede actualizar sus datos de salud');
select throws_ok($$ insert into public.clientes (nombre) values ('Intruso') $$, '42501', null,
  'Un cliente no puede dar de alta clientes');
select is_empty($$ update public.clientes set nombre = 'Otro' returning 1 $$,
  'Un cliente no puede cambiar su ficha (lo hace el equipo)');
select results_eq($$ select cliente_id from public.planes_entreno $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca'::uuid) $$,
  'El cliente A solo ve su plan de entreno');
select is_empty($$ update public.planes_entreno set pauta = '{"sesiones": [1]}' returning 1 $$,
  'Un cliente no puede cambiar su pauta de entreno');
select throws_ok($$ insert into public.planes_nutricion (cliente_id) values ('00000000-0000-0000-0000-0000000000ca') $$,
  '42501', null, 'Un cliente no puede crear su plan de nutrición');
select lives_ok($$ insert into public.registro_entreno (cliente_id, semana, datos)
                   values ('00000000-0000-0000-0000-0000000000ca', '2026-W45', '{"s1": 60}') $$,
  'El cliente A apunta su entreno de la semana');
select throws_ok($$ insert into public.registro_entreno (cliente_id, semana)
                    values ('00000000-0000-0000-0000-0000000000cb', '2026-W45') $$, '42501', null,
  'El cliente A no puede apuntar en el registro de B');
select throws_ok($$ update public.registro_entreno set cliente_id = '00000000-0000-0000-0000-0000000000cb'
                    where cliente_id = '00000000-0000-0000-0000-0000000000ca' $$, '42501', null,
  'El cliente A no puede pasar su registro a otro cliente');
select lives_ok($$ insert into public.seguimientos (id, cliente_id, datos)
                   values ('00000000-0000-0000-0000-00000000005b', '00000000-0000-0000-0000-0000000000ca', '{"peso": 79}') $$,
  'El cliente A envía su seguimiento');
select throws_ok($$ insert into public.seguimientos (cliente_id, revisado)
                    values ('00000000-0000-0000-0000-0000000000ca', true) $$, '42501', null,
  'Un cliente no puede enviar un seguimiento ya marcado como revisado');
select throws_ok($$ update public.seguimientos set revisado = true
                    where id = '00000000-0000-0000-0000-00000000005a' $$, '42501', null,
  'Un cliente no puede marcar su seguimiento como revisado');
select throws_ok($$ insert into public.seguimientos (cliente_id) values ('00000000-0000-0000-0000-0000000000cb') $$,
  '42501', null, 'El cliente A no puede enviar seguimientos a nombre de B');
select results_eq($$ select id from public.mensajes order by fecha $$,
  $$ values ('00000000-0000-0000-0000-0000000001a1'::uuid) $$,
  'El cliente A solo ve los mensajes de su chat');
select lives_ok($$ insert into public.mensajes (id, cliente_id, lado, texto)
                   values ('00000000-0000-0000-0000-0000000002a1', '00000000-0000-0000-0000-0000000000ca', 'out', 'Hola') $$,
  'El cliente A escribe en su chat');
select is((select autor from public.mensajes where id = '00000000-0000-0000-0000-0000000002a1'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'El autor del mensaje lo pone la base de datos');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, texto, autor)
                    values ('00000000-0000-0000-0000-0000000000ca', 'out', 'x', '00000000-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'Un cliente no puede escribir a nombre de otra persona');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, texto)
                    values ('00000000-0000-0000-0000-0000000000ca', 'in', 'Soy tu coach') $$,
  '42501', null, 'Un cliente no puede escribir en el lado del equipo');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, texto)
                    values ('00000000-0000-0000-0000-0000000000cb', 'out', 'x') $$,
  '42501', null, 'El cliente A no puede escribir en el chat de B');
select throws_ok($$ insert into public.mensajes (cliente_id, lado)
                    values ('00000000-0000-0000-0000-0000000000ca', 'out') $$,
  '23514', null, 'No se pueden enviar mensajes vacíos');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, tipo, archivo_ruta)
                    values ('00000000-0000-0000-0000-0000000000ca', 'out', 'foto', '00000000-0000-0000-0000-0000000000cb/foto.jpg') $$,
  '42501', null, 'Un mensaje no puede apuntar a archivos de otro cliente');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, texto, cita_de)
                    values ('00000000-0000-0000-0000-0000000000ca', 'out', 'x', '00000000-0000-0000-0000-0000000001b1') $$,
  '23514', null, 'Un mensaje no puede citar uno de otro chat');
select throws_ok($$ update public.mensajes set texto = 'editado'
                    where id = '00000000-0000-0000-0000-0000000002a1' $$, '42501', null,
  'Un mensaje no se puede editar');
select lives_ok($$ update public.mensajes set eliminado = true, texto = null
                   where id = '00000000-0000-0000-0000-0000000002a1' $$,
  'El autor puede vaciar su mensaje');
select is_empty($$ update public.mensajes set eliminado = true, texto = null
                   where id = '00000000-0000-0000-0000-0000000001a1' returning 1 $$,
  'Un cliente no puede vaciar mensajes del equipo');
select results_eq($$ select count(*)::int from public.pagos $$, $$ values (1) $$,
  'El cliente A solo ve sus pagos');
select throws_ok($$ insert into public.pagos (cliente_id, importe, metodo)
                    values ('00000000-0000-0000-0000-0000000000ca', 1, 'bizum') $$, '42501', null,
  'Un cliente no puede registrar pagos');
select throws_ok($$ insert into public.facturas (emisor, serie, numero, datos, total)
                    values ('00000000-0000-0000-0000-0000000000f1', 'A', 1, '{}', 1) $$, '42501', null,
  'Un cliente no puede crear facturas');
select results_eq($$ select count(*)::int from public.config_pagos $$, $$ values (1) $$,
  'Un cliente activo ve cómo pagar');
select is_empty($$ update public.config_pagos set iban = 'ES0000000000000000000000' returning 1 $$,
  'Un cliente no puede cambiar los datos de pago');
select is_empty($$ select * from public.equipo $$,
  'Un cliente no ve la tabla del equipo');
select throws_ok($$ select * from privado.codigos_acceso $$, '42501', null,
  'Nadie desde la app puede leer los códigos de acceso');
select throws_ok($$ insert into public.catalogo (tipo, nombre) values ('ejercicio', 'x') $$, '42501', null,
  'Un cliente no puede añadir al catálogo');
reset role;

-- ---------------------------------------------------------------------
-- 4 · Cliente C (de baja) y usuario E (sin ficha)
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ select * from public.clientes $$, 'Un cliente de baja ya no ve su ficha');
select is_empty($$ select * from public.mensajes $$, 'Un cliente de baja ya no ve su chat');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, texto)
                    values ('00000000-0000-0000-0000-0000000000cc', 'out', 'x') $$, '42501', null,
  'Un cliente de baja no puede escribir');
reset role;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ select * from public.clientes $$, 'Una cuenta sin ficha no ve clientes');
select is_empty($$ select * from public.mensajes $$, 'Una cuenta sin ficha no ve mensajes');
select is_empty($$ select * from public.config_pagos $$, 'Una cuenta sin ficha no ve los datos de pago');
reset role;

-- ---------------------------------------------------------------------
-- 5 · Domingo (entrenador)
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;

select results_eq($$ select count(*)::int from public.clientes $$, $$ values (3) $$,
  'El equipo ve todos los clientes');
select lives_ok($$ update public.planes_entreno set pauta = '{"sesiones": ["Día 1"]}'
                   where cliente_id = '00000000-0000-0000-0000-0000000000ca' $$,
  'El entrenador edita el plan de entreno');
select is((select actualizado_por from public.planes_entreno where cliente_id = '00000000-0000-0000-0000-0000000000ca'),
  '00000000-0000-0000-0000-0000000000d1'::uuid, 'Queda registrado quién cambió el plan');
select is_empty($$ update public.planes_nutricion set pauta = '{"comidas": [1]}' returning 1 $$,
  'El entrenador no edita planes de nutrición');
select is_empty($$ update public.salud set datos = '{}' returning 1 $$,
  'El equipo no cambia los datos de salud del cliente');
select is_empty($$ update public.seguimientos set datos = '{"peso": 70}'
                    where id = '00000000-0000-0000-0000-00000000005a' returning 1 $$,
  'El equipo no cambia lo que escribió el cliente en su seguimiento');
select throws_ok($$ update public.seguimientos set revisado = true, nota_equipo = 'Muy bien'
                   where id = '00000000-0000-0000-0000-00000000005a' $$, '42501', null,
  'La revisión única antigua ya no se usa (ahora va por profesional, en seguimiento_equipo)');
select is((select revisado from public.seguimientos where id = '00000000-0000-0000-0000-00000000005a'),
  false, 'Y el seguimiento sigue sin la marca antigua');
select lives_ok($$ insert into public.mensajes (cliente_id, lado, texto)
                   values ('00000000-0000-0000-0000-0000000000cb', 'in', 'Hola B') $$,
  'El equipo escribe en cualquier chat');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, texto)
                    values ('00000000-0000-0000-0000-0000000000cb', 'out', 'Soy B') $$, '42501', null,
  'El equipo no puede escribir en el lado del cliente');
select lives_ok($$ insert into public.pagos (id, cliente_id, importe, metodo)
                   values ('00000000-0000-0000-0000-0000000003a1', '00000000-0000-0000-0000-0000000000ca', 50, 'transferencia') $$,
  'El equipo registra un pago');
select is((select registrado_por from public.pagos where id = '00000000-0000-0000-0000-0000000003a1'),
  '00000000-0000-0000-0000-0000000000d1'::uuid, 'Queda registrado quién apuntó el pago');
select lives_ok($$ update public.clientes set estado = 'baja', baja = '{"motivo": "fin del plan", "por": "falso"}'
                   where id = '00000000-0000-0000-0000-0000000000cb' $$,
  'El equipo da de baja a un cliente');
select is((select baja ->> 'por' from public.clientes where id = '00000000-0000-0000-0000-0000000000cb'),
  '00000000-0000-0000-0000-0000000000d1', 'La baja registra quién la dio, aunque la app diga otra cosa');
select throws_ok($$ delete from public.clientes where id = '00000000-0000-0000-0000-0000000000ca' $$, '42501', null,
  'Nadie borra clientes desde la app (lo hace el servidor a los 15 días)');
select throws_ok($$ insert into public.clientes (nombre) values ('Nuevo') $$, '42501', null,
  'El alta de clientes solo la hace el servidor');
select throws_ok($$ update public.equipo set rol = 'dietista' $$, '42501', null,
  'Nadie cambia los papeles del equipo desde la app');
reset role;

-- ---------------------------------------------------------------------
-- 6 · Fátima (dietista)
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ update public.planes_nutricion set pauta = '{"comidas": ["Desayuno"]}'
                   where cliente_id = '00000000-0000-0000-0000-0000000000ca' $$,
  'La dietista edita el plan de nutrición');
select is_empty($$ update public.planes_entreno set pauta = '{"sesiones": []}' returning 1 $$,
  'La dietista no edita planes de entreno');
reset role;

select * from finish();
rollback;

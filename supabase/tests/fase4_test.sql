-- =====================================================================
-- Pruebas de la fase 4 (pgTAP) · supabase test db
-- Impago y margen, facturas sin huecos, altas y códigos, tarea diaria y archivos.
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(68);

-- ---------------------------------------------------------------------
-- Datos de prueba
-- ---------------------------------------------------------------------
--   Domingo (entrenador) ...d1 · Fátima (dietista) ...f1
--   A  ficha ...ca  usuario ...a1  pago al día
--   B  ficha ...cb  usuario ...b1  pago al día
--   M  ficha ...c2  usuario ...a2  pago vencido hace 3 días (margen)
--   X  ficha ...c3  usuario ...a3  pago vencido hace 10 días (sin acceso)
--   N  ficha ...c7  usuario ...a4  pago vencido hace 6 días (margen, cerca del corte)
--   I  ficha ...c4  sin cuenta     pago vencido hace 23 días (se borra)
--   V  ficha ...c5  sin cuenta     de baja hace 16 días (se borra)
--   R  ficha ...c6  sin cuenta     de baja hoy (se queda)
--   E  usuario ...e1 sin ficha (para canjear un código)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'fatima@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'm@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'x@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'n@prueba.local'),
  ('00000000-0000-0000-0000-0000000000e1', 'e@prueba.local');
insert into public.equipo (user_id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador'),
  ('00000000-0000-0000-0000-0000000000f1', 'Fátima', 'dietista');
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'A', current_date + 20),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'B', current_date + 20),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a2', 'M', current_date - 3),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a3', 'X', current_date - 10),
  ('00000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-0000000000a4', 'N', current_date - 6),
  ('00000000-0000-0000-0000-0000000000c4', null, 'I', current_date - 23),
  ('00000000-0000-0000-0000-0000000000c5', null, 'V', current_date + 20),
  ('00000000-0000-0000-0000-0000000000c6', null, 'R', current_date + 20);
update public.clientes set estado = 'baja' where id in ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6');
-- V se dio de baja hace 16 días (se salta el trigger solo para preparar la prueba)
set local session_replication_role = replica;
update public.clientes set baja = jsonb_build_object('fecha', now() - interval '16 days')
 where id = '00000000-0000-0000-0000-0000000000c5';
set local session_replication_role = origin;

insert into public.planes_entreno (cliente_id) values
  ('00000000-0000-0000-0000-0000000000ca'), ('00000000-0000-0000-0000-0000000000c2');
insert into public.pagos (id, cliente_id, importe, metodo) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000ca', 50, 'bizum'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000ca', 30, 'bizum'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000cb', 40, 'bizum'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000ca', 20, 'transferencia'),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000c2', 25, 'bizum');
-- Una factura del mes pasado y otra del cliente I (que se borrará)
insert into public.facturas (emisor, serie, anio, numero, tipo, cliente_id, fecha, datos, total) values
  ('00000000-0000-0000-0000-0000000000f1', 'F', 2026, 900, 'cliente', '00000000-0000-0000-0000-0000000000cb',
   (date_trunc('month', current_date) - interval '1 month')::date, '{}', 120),
  ('00000000-0000-0000-0000-0000000000f1', 'F', 2026, 901, 'cliente', '00000000-0000-0000-0000-0000000000c4',
   (date_trunc('month', current_date) - interval '1 month')::date + 1, '{}', 10);

-- ---------------------------------------------------------------------
-- 1 · Margen de impago (cliente M)
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.clientes $$, $$ values (1) $$,
  'En el margen, el cliente ve su ficha (para saber su situación)');
select is_empty($$ select * from public.planes_entreno $$,
  'En el margen, el cliente ya no ve su plan');
select results_eq($$ select count(*)::int from public.config_pagos $$, $$ values (1) $$,
  'En el margen, el cliente ve cómo pagar');
select results_eq($$ select count(*)::int from public.pagos $$, $$ values (1) $$,
  'En el margen, el cliente ve sus pagos');
select lives_ok($$ insert into public.mensajes (cliente_id, lado, texto)
                   values ('00000000-0000-0000-0000-0000000000c2', 'out', 'Ya he pagado') $$,
  'En el margen, el cliente puede escribir por el chat');
select throws_ok($$ insert into public.registro_entreno (cliente_id, semana)
                    values ('00000000-0000-0000-0000-0000000000c2', '2026-W45') $$, '42501', null,
  'En el margen, el cliente no puede apuntar su entreno');
select throws_ok($$ insert into public.seguimientos (cliente_id) values ('00000000-0000-0000-0000-0000000000c2') $$,
  '42501', null, 'En el margen, el cliente no puede enviar seguimientos');
select lives_ok($$ insert into storage.objects (bucket_id, name)
                   values ('fotos', '00000000-0000-0000-0000-0000000000c2/justificante.jpg') $$,
  'En el margen, el cliente puede mandar una foto por el chat (justificante)');
select throws_ok($$ insert into storage.objects (bucket_id, name)
                    values ('documentos', '00000000-0000-0000-0000-0000000000c2/x.pdf') $$, '42501', null,
  'Un cliente no sube documentos');
reset role;

-- ---------------------------------------------------------------------
-- 2 · Sin acceso (cliente X, 10 días tras vencer)
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a3", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ select * from public.clientes $$, 'Pasado el margen, el cliente no ve su ficha');
select is_empty($$ select * from public.mensajes $$, 'Pasado el margen, el cliente no ve el chat');
select is_empty($$ select * from public.config_pagos $$, 'Pasado el margen, el cliente no ve nada');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, texto)
                    values ('00000000-0000-0000-0000-0000000000c3', 'out', 'x') $$, '42501', null,
  'Pasado el margen, el cliente no puede escribir');
reset role;

-- ---------------------------------------------------------------------
-- 3 · Registrar un pago devuelve el acceso (Domingo registra el pago de M)
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.pagos (cliente_id, importe, metodo, periodo_desde, periodo_hasta)
                   values ('00000000-0000-0000-0000-0000000000c2', 50, 'bizum', current_date, current_date + 30) $$,
  'El equipo registra el pago de M con su periodo');
select throws_ok($$ insert into public.pagos (cliente_id, importe, metodo, periodo_hasta)
                    values ('00000000-0000-0000-0000-0000000000c2', 50, 'bizum', current_date + 900) $$, '23514', null,
  'No se puede dar acceso pagado a más de 400 días');
reset role;
select is((select acceso_hasta from public.clientes where id = '00000000-0000-0000-0000-0000000000c2'),
  current_date + 30, 'El pago amplía el acceso hasta el final del periodo');
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.planes_entreno $$, $$ values (1) $$,
  'Con el pago registrado, el cliente vuelve a ver su plan al momento');
reset role;

-- ---------------------------------------------------------------------
-- 4 · Facturas de Fátima a clientes
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select is(public.emitir_factura_cliente(array['00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2']::uuid[],
                                        '{"nombre": "Cliente A", "nif": "12345678Z", "otro": "se ignora"}'),
  'F-' || extract(year from current_date)::int || '-0001', 'Fátima emite la primera factura del año: F-AAAA-0001');
select results_eq($$ select total from public.facturas where numero = 1 and serie = 'F' $$, $$ values (80.00::numeric(10,2)) $$,
  'El total lo calcula el servidor a partir de los pagos');
select is((select datos -> 'receptor' from public.facturas where numero = 1 and serie = 'F'),
  '{"nombre": "Cliente A", "nif": "12345678Z"}'::jsonb, 'Del receptor solo se guardan los campos previstos');
select results_eq($$ select count(*)::int from public.pagos where factura_id is not null $$, $$ values (2) $$,
  'Los pagos quedan marcados como facturados');
select throws_ok($$ select public.emitir_factura_cliente(array['00000000-0000-0000-0000-0000000000f1']::uuid[], '{"nombre": "A"}') $$,
  '22023', null, 'Un pago ya facturado no se vuelve a facturar');
select throws_ok($$ select public.emitir_factura_cliente(array['00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f4']::uuid[], '{"nombre": "A"}') $$,
  '22023', null, 'Una factura no mezcla pagos de clientes distintos');
select throws_ok($$ select public.emitir_factura_cliente(array['00000000-0000-0000-0000-0000000000f4']::uuid[], '{"nif": "1"}') $$,
  '22023', null, 'Una factura necesita el nombre del receptor');
select is(public.emitir_factura_cliente(array['00000000-0000-0000-0000-0000000000f4']::uuid[], '{"nombre": "Cliente A"}'),
  'F-' || extract(year from current_date)::int || '-0002', 'Tras los intentos fallidos, la siguiente es la 0002: no hay huecos');
select throws_ok($$ select public.emitir_factura_mensual((date_trunc('month', current_date) - interval '1 month')::date, '{"nombre": "Fátima"}') $$,
  '42501', null, 'Fátima no emite la factura mensual de Domingo');
select throws_ok($$ update public.facturas set total = 1 $$, '42501', null, 'Nadie cambia una factura desde la app');
reset role;

-- ---------------------------------------------------------------------
-- 5 · Factura mensual de Domingo a Fátima
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ select public.emitir_factura_cliente(array['00000000-0000-0000-0000-0000000000f5']::uuid[], '{"nombre": "M"}') $$,
  '42501', null, 'Domingo no emite facturas a clientes');
select throws_ok($$ select public.emitir_factura_mensual(current_date, '{"nombre": "Fátima"}') $$,
  '22023', null, 'El mes en curso no se puede facturar todavía');
select is(public.emitir_factura_mensual((date_trunc('month', current_date) - interval '1 month')::date, '{"nombre": "Fátima", "nif": "X"}'),
  'D-' || extract(year from current_date)::int || '-0001', 'Domingo emite su factura mensual: D-AAAA-0001');
select results_eq($$ select total from public.facturas where serie = 'D' $$, $$ values (130.00::numeric(10,2)) $$,
  'La factura mensual suma lo que Fátima facturó ese mes');
select throws_ok($$ select public.emitir_factura_mensual((date_trunc('month', current_date) - interval '1 month')::date, '{"nombre": "Fátima"}') $$,
  '23505', null, 'Un mes no se factura dos veces');
reset role;

-- ---------------------------------------------------------------------
-- 6 · Quién puede usar qué función
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ select public.emitir_factura_cliente(array['00000000-0000-0000-0000-0000000000f4']::uuid[], '{"nombre": "Yo"}') $$,
  '42501', null, 'Un cliente no puede emitir facturas');
select results_eq($$ select count(*)::int from public.facturas $$, $$ values (2) $$,
  'El cliente A ve solo sus facturas');
reset role;
select ok(not has_function_privilege('anon', 'public.emitir_factura_cliente(uuid[], jsonb)', 'execute'),
  'Sin sesión no se pueden emitir facturas');
select ok(not has_function_privilege('authenticated', 'public.alta_cliente(uuid, jsonb, date, text)', 'execute')
      and not has_function_privilege('authenticated', 'public.vincular_cliente(text, uuid)', 'execute')
      and not has_function_privilege('authenticated', 'public.consultar_codigo(text)', 'execute')
      and not has_function_privilege('authenticated', 'public.nuevo_codigo(uuid, uuid, text)', 'execute')
      and not has_function_privilege('authenticated', 'public.permitir_intento_canje(text)', 'execute')
      and not has_function_privilege('authenticated', 'public.tarea_diaria()', 'execute')
      and not has_function_privilege('authenticated', 'public.borrados_por_procesar()', 'execute')
      and not has_function_privilege('authenticated', 'privado.siguiente_numero(text, integer)', 'execute'),
  'Altas, códigos, tarea diaria y numeración solo los usa el servidor');
select ok(not has_function_privilege('anon', 'public.alta_cliente(uuid, jsonb, date, text)', 'execute')
      and not has_function_privilege('anon', 'public.vincular_cliente(text, uuid)', 'execute'),
  'Sin sesión tampoco');

-- ---------------------------------------------------------------------
-- 7 · Altas y códigos (como el servidor)
-- ---------------------------------------------------------------------
set local role service_role;
select throws_ok($$ select public.alta_cliente('00000000-0000-0000-0000-0000000000a1', '{"nombre": "Colado"}', current_date + 30, repeat('a', 64)) $$,
  '42501', null, 'El servidor rechaza un alta pedida por alguien que no es del equipo');
select throws_ok($$ select public.alta_cliente('00000000-0000-0000-0000-0000000000d1', '{"nombre": "Nueva"}', current_date - 1, repeat('a', 64)) $$,
  '22023', null, 'El acceso pagado no puede empezar vencido');
select throws_ok($$ select public.alta_cliente('00000000-0000-0000-0000-0000000000d1', '{"nombre": "Nueva"}', current_date + 30, 'no-es-una-huella') $$,
  '23514', null, 'El código solo se guarda como huella');
select lives_ok($$ select public.alta_cliente('00000000-0000-0000-0000-0000000000d1',
                    '{"nombre": " Nueva ", "email": "NUEVA@Prueba.local", "telefono": "+34 600 11 22 33"}', current_date + 30, repeat('a', 64)) $$,
  'El equipo da de alta un cliente');
select results_eq($$ select nombre, email, telefono, acceso_hasta from public.clientes where nombre = 'Nueva' $$,
  $$ values ('Nueva'::text, 'nueva@prueba.local'::text, '+34600112233'::text, current_date + 30) $$,
  'El alta guarda los datos limpios y el acceso pagado');
select results_eq($$ select (select count(*) from public.salud s where s.cliente_id = c.id)::int
                          + (select count(*) from public.planes_entreno p where p.cliente_id = c.id)::int
                          + (select count(*) from public.planes_nutricion n where n.cliente_id = c.id)::int
                     from public.clientes c where c.nombre = 'Nueva' $$, $$ values (3) $$,
  'El alta crea su apartado de salud y sus dos planes');
select ok((select caduca between now() + interval '71 hours' and now() + interval '73 hours'
             from privado.codigos_acceso where huella = repeat('a', 64)),
  'El código caduca a los 3 días');
select is(public.consultar_codigo(repeat('a', 64)), (select id from public.clientes where nombre = 'Nueva'),
  'Un código válido se reconoce');
select is(public.consultar_codigo(repeat('0', 64)), null::uuid, 'Un código inventado no se reconoce');
select is(public.vincular_cliente(repeat('a', 64), '00000000-0000-0000-0000-0000000000e1'),
  (select id from public.clientes where nombre = 'Nueva'), 'Canjear el código une la cuenta a la ficha');
select is((select user_id from public.clientes where nombre = 'Nueva'), '00000000-0000-0000-0000-0000000000e1'::uuid,
  'La ficha queda unida a su cuenta');
select is(public.vincular_cliente(repeat('a', 64), '00000000-0000-0000-0000-0000000000e1'), null::uuid,
  'Un código solo se puede canjear una vez');
select throws_ok($$ select public.nuevo_codigo('00000000-0000-0000-0000-0000000000d1', (select id from public.clientes where nombre = 'Nueva'), repeat('c', 64)) $$,
  '22023', null, 'No se generan códigos para quien ya tiene cuenta');
select lives_ok($$ select public.alta_cliente('00000000-0000-0000-0000-0000000000d1', '{"nombre": "Tardía"}', current_date + 30, repeat('d', 64)) $$,
  'Segundo alta, para probar la caducidad');
reset role;
update privado.codigos_acceso set caduca = now() - interval '1 minute' where huella = repeat('d', 64);
set local role service_role;
select is(public.consultar_codigo(repeat('d', 64)), null::uuid, 'Un código caducado no sirve');
select results_eq($$ select count(*) filter (where permitido)::int
                     from (select public.permitir_intento_canje(repeat('b', 64)) as permitido from generate_series(1, 12)) s $$,
  $$ values (10) $$, 'Desde un mismo origen solo se permiten 10 intentos de canje por hora');

-- ---------------------------------------------------------------------
-- 8 · Tarea diaria: avisos y borrados
-- ---------------------------------------------------------------------
select is((public.tarea_diaria() ->> 'avisos')::int, 2,
  'La tarea diaria avisa por el chat a N: pago vencido y corte cercano');
select results_eq($$ select count(*)::int from public.mensajes
                     where cliente_id = '00000000-0000-0000-0000-0000000000c7' and texto like 'Aviso automático:%' $$,
  $$ values (2) $$, 'N tiene los dos avisos en su chat');
select is((public.tarea_diaria() ->> 'avisos')::int, 0, 'Los avisos no se repiten al día siguiente');
select is_empty($$ select id from public.clientes
                   where id in ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c5') $$,
  'Se borran I (15 días sin acceso por impago) y V (15 días de baja)');
select results_eq($$ select count(*)::int from public.clientes
                     where id in ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000c3') $$,
  $$ values (2) $$, 'Se conservan R (baja reciente) y X (aún dentro de los 15 días)');
select results_eq($$ select cliente_id from public.facturas where numero = 901 $$, $$ values (null::uuid) $$,
  'La factura del cliente borrado se conserva');
select results_eq($$ select count(*)::int from public.borrados_por_procesar() $$, $$ values (2) $$,
  'Quedan apuntados para borrar sus archivos y cuentas');
reset role;

-- ---------------------------------------------------------------------
-- 9 · Archivos
-- ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('fotos', '00000000-0000-0000-0000-0000000000ca/progreso.jpg') $$,
  'El cliente sube una foto a su carpeta');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('fotos', '00000000-0000-0000-0000-0000000000cb/x.jpg') $$,
  '42501', null, 'El cliente no sube a la carpeta de otro');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('fotos', '00000000-0000-0000-0000-0000000000ca/sub/x.jpg') $$,
  '42501', null, 'No se admiten subcarpetas');
reset role;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('documentos', '00000000-0000-0000-0000-0000000000ca/protocolo.pdf') $$,
  'Fátima sube un PDF a la carpeta de A');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('documentos', '00000000-0000-0000-0000-00000000dead/x.pdf') $$,
  '42501', null, 'El equipo no sube a carpetas de clientes que no existen');
reset role;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select name from storage.objects order by name $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca/progreso.jpg'::text), ('00000000-0000-0000-0000-0000000000ca/protocolo.pdf'::text) $$,
  'El cliente ve solo sus archivos');
reset role;
set local storage.allow_delete_query = 'true';   -- Supabase solo deja borrar por SQL con este permiso
set local role authenticated;
select is_empty($$ delete from storage.objects where name like '%protocolo.pdf' returning 1 $$,
  'El cliente no borra lo que subió Fátima');
reset role;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ select * from storage.objects $$, 'B no ve los archivos de A');
reset role;

select * from finish();
rollback;

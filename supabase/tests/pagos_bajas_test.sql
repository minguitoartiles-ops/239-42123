-- =====================================================================
-- Pruebas de pagos y bajas desde la app (paso 7) · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

--   Domingo ...d1 · Fátima ...f1
--   A  ficha ...ca  usuario ...a1  al día
--   B  ficha ...cb  usuario ...b1  de baja; llevaba 30 días sin pagar
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'fatima@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@prueba.local');
insert into public.equipo (user_id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador'),
  ('00000000-0000-0000-0000-0000000000f1', 'Fátima', 'dietista');
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'A', current_date + 20),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'B', current_date - 30);
update public.clientes set estado = 'baja' where id = '00000000-0000-0000-0000-0000000000cb';

-- ---------- Domingo ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.pagos (id, cliente_id, importe, metodo, periodo_desde, periodo_hasta)
  values ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000ca', 60, 'bizum', current_date + 20, current_date + 50) $$,
  'Registra el pago de un cliente activo');
select throws_ok($$ insert into public.pagos (cliente_id, importe, metodo, fecha)
  values ('00000000-0000-0000-0000-0000000000ca', 60, 'bizum', current_date - 500) $$, '23514', null,
  'Un pago con una fecha absurda, no');
select throws_ok($$ insert into public.pagos (cliente_id, importe, metodo, fecha)
  values ('00000000-0000-0000-0000-0000000000ca', 60, 'bizum', current_date + 5) $$, '23514', null,
  'Ni con fecha futura');
select throws_ok($$ insert into public.pagos (cliente_id, importe, metodo)
  values ('00000000-0000-0000-0000-0000000000cb', 60, 'bizum') $$, '23514', null,
  'A un cliente de baja no se le registran pagos');
select throws_ok($$ insert into public.pagos (cliente_id, importe, metodo)
  values ('00000000-0000-0000-0000-0000000000ca', 0, 'bizum') $$, '23514', null,
  'Sin importe, no');
select throws_ok($$ update public.pagos set importe = 1 $$, '42501', null,
  'Un pago registrado no se cambia desde la app');
select throws_ok($$ delete from public.pagos $$, '42501', null, 'Ni se borra');
select throws_ok($$ update public.clientes set acceso_hasta = current_date + 900 where id = '00000000-0000-0000-0000-0000000000ca' $$,
  '23514', null, '«Pagado hasta» no puede irse a años vista');
select lives_ok($$ update public.clientes set acceso_hasta = current_date + 70, tarifa = 'trimestral', precio = 150
  where id = '00000000-0000-0000-0000-0000000000ca' $$, 'Cambia tarifa, precio y «pagado hasta»');
select lives_ok($$ update public.config_pagos set enlace = 'https://pago.ejemplo.com/fitness', bizum = '{"+34 600 000 000"}' $$,
  'Guarda el enlace de pago y el Bizum');
select throws_ok($$ update public.config_pagos set enlace = 'http://pago.ejemplo.com' $$, '23514', null, 'El enlace tiene que ser https');
select throws_ok($$ update public.config_pagos set enlace = 'javascript:alert(1)' $$, '23514', null, 'Nada de enlaces raros');
select throws_ok($$ update public.config_pagos set bizum = '{"llámame"}' $$, '23514', null, 'Un Bizum tiene que ser un número');
-- Reactiva a B (llevaba 30 días sin pagar)
select lives_ok($$ update public.clientes set estado = 'activo' where id = '00000000-0000-0000-0000-0000000000cb' $$,
  'Reactiva a un cliente de baja');
reset role;
select is((select acceso_hasta from public.clientes where id = '00000000-0000-0000-0000-0000000000cb'), current_date - 1,
  'Vuelve en el margen de pago (ayer fue su último día pagado)');
select is((select baja from public.clientes where id = '00000000-0000-0000-0000-0000000000cb'), null, 'Sin la baja');
select is((select acceso_hasta from public.clientes where id = '00000000-0000-0000-0000-0000000000ca'), current_date + 70,
  'El pago no recorta lo que se cambió a mano después');

-- La tarea de la noche no le borra por el impago antiguo
select lives_ok($$ select public.tarea_diaria() $$, 'La tarea diaria corre');
select ok(exists (select 1 from public.clientes where id = '00000000-0000-0000-0000-0000000000cb'), 'B sigue ahí tras la tarea diaria');

-- ---------- Fátima también registra pagos ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.pagos (cliente_id, importe, metodo, periodo_hasta)
  values ('00000000-0000-0000-0000-0000000000cb', 45, 'transferencia', current_date + 29) $$, 'Fátima registra el pago de B');
reset role;
select is((select acceso_hasta from public.clientes where id = '00000000-0000-0000-0000-0000000000cb'), current_date + 29,
  'Y B vuelve a tener acceso completo');

-- ---------- B (cliente) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select enlace from public.config_pagos $$, $$ values ('https://pago.ejemplo.com/fitness'::text) $$,
  'El cliente ve el enlace de pago');
select is_empty($$ update public.config_pagos set enlace = 'https://otra.com' returning 1 $$, 'Pero no lo cambia');
select results_eq($$ select count(*)::int from public.pagos $$, $$ values (1) $$, 'Solo ve sus pagos');
reset role;

select * from finish();
rollback;

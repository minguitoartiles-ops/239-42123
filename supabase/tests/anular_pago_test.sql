-- =====================================================================
-- Pruebas de «Anular pago» · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'fatima@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local');
insert into public.equipo (user_id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador'),
  ('00000000-0000-0000-0000-0000000000f1', 'Fátima', 'dietista');
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'A', current_date + 5);

-- ---------- Domingo apunta dos pagos (el segundo, por error) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
insert into public.pagos (id, cliente_id, importe, metodo, periodo_desde, periodo_hasta) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000ca', 80, 'bizum', current_date + 5, current_date + 35);
insert into public.pagos (id, cliente_id, importe, metodo, periodo_desde, periodo_hasta) values
  ('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-0000000000ca', 80, 'bizum', current_date + 35, current_date + 65);
reset role;
select is((select acceso_antes from public.pagos where id = '00000000-0000-0000-0000-0000000001a2'), current_date + 35,
  'Cada pago guarda cómo estaba «pagado hasta» antes');
select is((select acceso_hasta from public.clientes where id = '00000000-0000-0000-0000-0000000000ca'), current_date + 65, 'Pagado hasta +65');

set local role authenticated;
select throws_ok($$ select public.anular_pago('00000000-0000-0000-0000-0000000001a2', '  ') $$, '22023', null, 'Hace falta un motivo');
select lives_ok($$ select public.anular_pago('00000000-0000-0000-0000-0000000001a2', 'Apuntado dos veces') $$, 'Anula el pago repetido');
select throws_ok($$ select public.anular_pago('00000000-0000-0000-0000-0000000001a2', 'otra vez') $$, '22023', null, 'No se anula dos veces');
select throws_ok($$ update public.pagos set anulado = null $$, '42501', null, 'La anulación no se deshace a mano');
reset role;
select is((select acceso_hasta from public.clientes where id = '00000000-0000-0000-0000-0000000000ca'), current_date + 35,
  '«Pagado hasta» vuelve a como estaba antes de ese pago');
select results_eq($$ select anulado is not null, anulado_por, anulado_motivo from public.pagos where id = '00000000-0000-0000-0000-0000000001a2' $$,
  $$ values (true, '00000000-0000-0000-0000-0000000000d1'::uuid, 'Apuntado dos veces'::text) $$, 'Queda quién, cuándo y por qué');
select ok(exists (select 1 from public.pagos where id = '00000000-0000-0000-0000-0000000001a2'), 'El pago no se borra');

-- Si después se cambió «pagado hasta» a mano, anular no lo toca
update public.clientes set acceso_hasta = current_date + 50 where id = '00000000-0000-0000-0000-0000000000ca';
set local role authenticated;
select lives_ok($$ select public.anular_pago('00000000-0000-0000-0000-0000000001a1', 'Era de otro cliente') $$, 'Anula el primero');
reset role;
select is((select acceso_hasta from public.clientes where id = '00000000-0000-0000-0000-0000000000ca'), current_date + 50,
  'Un cambio posterior a mano se respeta');

-- ---------- Fátima no puede facturar pagos anulados; uno facturado no se anula ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ select public.emitir_factura_cliente(array['00000000-0000-0000-0000-0000000001a1'::uuid], '{"nombre": "A"}') $$,
  '22023', null, 'Un pago anulado no se factura');
insert into public.pagos (id, cliente_id, importe, metodo) values
  ('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-0000000000ca', 80, 'bizum');
select lives_ok($$ select public.emitir_factura_cliente(array['00000000-0000-0000-0000-0000000001a3'::uuid], '{"nombre": "A"}') $$, 'Factura uno válido');
select throws_ok($$ select public.anular_pago('00000000-0000-0000-0000-0000000001a3', 'error') $$, '22023', null,
  'Un pago con factura no se anula');
reset role;

-- ---------- El cliente no anula ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ select public.anular_pago('00000000-0000-0000-0000-0000000001a3', 'no') $$, '42501', null, 'Un cliente no anula pagos');
reset role;
select throws_ok($$ select set_config('request.jwt.claims', '', true); set local role anon; select public.anular_pago('00000000-0000-0000-0000-0000000001a3', 'x') $$,
  '42501', null, 'Sin sesión, tampoco');

select * from finish();
rollback;

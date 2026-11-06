-- =====================================================================
-- Pruebas de las facturas (paso 8) · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'fatima@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local');
insert into public.equipo (user_id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador'),
  ('00000000-0000-0000-0000-0000000000f1', 'Fátima', 'dietista');
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'A', current_date + 20),
  ('00000000-0000-0000-0000-0000000000cb', null, 'B', current_date + 20);
-- Pagos del mes pasado: 80 + 80 + 40 (anulado) → cuentan 160
insert into public.pagos (id, cliente_id, importe, metodo, fecha) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000ca', 80, 'bizum', (date_trunc('month', current_date) - interval '1 month')::date + 3),
  ('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-0000000000cb', 80, 'bizum', (date_trunc('month', current_date) - interval '1 month')::date + 9),
  ('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-0000000000cb', 40, 'bizum', (date_trunc('month', current_date) - interval '1 month')::date + 9),
  ('00000000-0000-0000-0000-0000000001a4', '00000000-0000-0000-0000-0000000000ca', 80, 'bizum', current_date);
update public.pagos set anulado = now(), anulado_motivo = 'prueba' where id = '00000000-0000-0000-0000-0000000001a3';

-- ---------- Datos fiscales ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ select public.emitir_factura_cliente(array['00000000-0000-0000-0000-0000000001a1'::uuid], '{"nombre": "A"}') $$,
  '22023', null, 'Sin datos de facturación, Fátima no puede facturar');
select throws_ok($$ insert into public.datos_fiscales (nombre, nif, direccion) values ('Fátima', 'no vale!', 'Calle 2, Pueblo') $$,
  '23514', null, 'Un NIF raro no se guarda');
select lives_ok($$ insert into public.datos_fiscales (nombre, nif, direccion) values ('Fátima T', '11.111.111-h', 'Calle 2, Pueblo') $$,
  'Guarda sus datos fiscales');
select is((select nif from public.datos_fiscales where user_id = '00000000-0000-0000-0000-0000000000f1'), '11111111H', 'El NIF se guarda limpio');
select throws_ok($$ insert into public.datos_fiscales (user_id, nombre, nif, direccion) values ('00000000-0000-0000-0000-0000000000d1', 'Otro', '22222222J', 'Calle 3, Pueblo') $$,
  '23505', null, 'No crea los datos de otro (se le ponen los suyos)');
reset role;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.datos_fiscales (nombre, nif, direccion) values ('Domingo A', '00000000T', 'Calle 1, Pueblo') $$, 'Domingo guarda los suyos');
select is_empty($$ update public.datos_fiscales set nombre = 'Cambiado' where user_id = '00000000-0000-0000-0000-0000000000f1' returning 1 $$,
  'No cambia los de Fátima');
select results_eq($$ select count(*)::int from public.datos_fiscales $$, $$ values (2) $$, 'Pero los ve (los necesita para su factura)');
-- numeración: Domingo sigue desde la 11
select lives_ok($$ select public.fijar_numeracion(10) $$, 'Domingo indica que su última fue la 10');
select results_eq($$ select serie, siguiente, se_puede_fijar from public.mi_numeracion() $$, $$ values ('D'::text, 11, true) $$, 'La próxima será la 11');
select throws_ok($$ select public.emitir_factura_mensual(current_date, null) $$, '22023', null, 'El mes en curso no se factura');
select is(public.emitir_factura_mensual((date_trunc('month', current_date) - interval '1 month')::date, null),
  'D-' || extract(year from current_date)::int || '-0011', 'Su factura mensual es la 11');
select results_eq($$ select (datos ->> 'base')::numeric, (datos -> 'retencion' ->> 'cuota')::numeric, total, datos -> 'receptor' ->> 'nif', datos -> 'emisor' ->> 'nombre'
                      from public.facturas where serie = 'D' $$,
  $$ values (80.00::numeric, 12.00::numeric, 68.00::numeric(10,2), '11111111H'::text, 'Domingo A'::text) $$,
  '50 % de lo pagado (160 € sin el anulado → 80 €), exenta de IGIC, retención 15 % → 68 €; a nombre de Fátima');
select throws_ok($$ select public.emitir_factura_mensual((date_trunc('month', current_date) - interval '1 month')::date, null) $$,
  '23505', null, 'Un mes no se factura dos veces');
select throws_ok($$ select public.fijar_numeracion(50) $$, '22023', null, 'Con facturas ya hechas este año, la numeración no se cambia');
select throws_ok($$ select public.emitir_factura_mensual((date_trunc('month', current_date) - interval '3 month')::date, null) $$,
  '22023', null, 'Un mes sin pagos no se factura');
select throws_ok($$ select public.emitir_factura_cliente(array['00000000-0000-0000-0000-0000000001a1'::uuid], '{"nombre": "A"}') $$,
  '42501', null, 'Domingo no factura a clientes');
reset role;

-- ---------- Fátima: su numeración y sus facturas ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ select public.fijar_numeracion(25) $$, 'Fátima indica que su última fue la 25');
select is(public.emitir_factura_cliente(array['00000000-0000-0000-0000-0000000001a1'::uuid], '{"nombre": "Cliente A", "nif": "12345678Z"}'),
  'F-' || extract(year from current_date)::int || '-0026', 'Su primera factura en la app es la 26');
select results_eq($$ select (datos ->> 'base')::numeric, (datos -> 'impuesto' ->> 'cuota')::numeric, total, datos -> 'emisor' ->> 'nombre' from public.facturas where serie = 'F' $$,
  $$ values (74.77::numeric, 5.23::numeric, 80.00::numeric(10,2), 'Fátima T'::text) $$, '80 € con el 7 % de IGIC incluido');
select throws_ok($$ select public.emitir_factura_cliente(array['00000000-0000-0000-0000-0000000001a3'::uuid], '{"nombre": "B"}') $$,
  '22023', null, 'Un pago anulado no se factura');
select throws_ok($$ select public.emitir_factura_mensual((date_trunc('month', current_date) - interval '1 month')::date, null) $$,
  '42501', null, 'Fátima no hace la factura de Domingo');
select lives_ok($$ update public.datos_fiscales set direccion = 'Calle Nueva 9, Pueblo' $$, 'Cambia su domicilio');
reset role;
select is((select datos -> 'emisor' ->> 'direccion' from public.facturas where serie = 'F'), 'Calle 2, Pueblo',
  'Las facturas ya hechas guardan los datos de entonces');

-- ---------- El cliente ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select serie from public.facturas $$, $$ values ('F'::text) $$, 'El cliente ve solo su factura (no la de Domingo a Fátima)');
select is_empty($$ select * from public.datos_fiscales $$, 'No ve los datos fiscales del equipo directamente');
select throws_ok($$ select public.fijar_numeracion(1) $$, '42501', null, 'Ni toca la numeración');
reset role;

select * from finish();
rollback;

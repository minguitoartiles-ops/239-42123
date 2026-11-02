-- =====================================================================
-- Pruebas de la ficha ampliada (programa, tarifa y precio) · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local');
insert into public.equipo (user_id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador');

set local role service_role;
select lives_ok($$ select public.alta_cliente('00000000-0000-0000-0000-0000000000d1',
  '{"nombre": "Con tarifa", "programa_semanas": "24", "tarifa": "trimestral", "precio": "149.90"}', current_date + 90, repeat('e', 64)) $$,
  'El alta guarda programa, tarifa y precio');
select results_eq($$ select programa_semanas, tarifa, precio from public.clientes where nombre = 'Con tarifa' $$,
  $$ values (24, 'trimestral'::text, 149.90::numeric(10,2)) $$, 'Los datos del alta quedan en la ficha');
select lives_ok($$ select public.alta_cliente('00000000-0000-0000-0000-0000000000d1', '{"nombre": "Por defecto"}', current_date, repeat('f', 64)) $$,
  'Sin esos datos, el alta usa los de por defecto');
select results_eq($$ select programa_semanas, tarifa, precio from public.clientes where nombre = 'Por defecto' $$,
  $$ values (12, 'mensual'::text, null::numeric(10,2)) $$, 'Por defecto: 12 semanas, mensual, sin precio');
select is((select inicio_programa from public.clientes where nombre = 'Por defecto'), current_date, 'El programa empieza el día del alta');
select throws_ok($$ select public.alta_cliente('00000000-0000-0000-0000-0000000000d1', '{"nombre": "X", "tarifa": "gratis"}', current_date, repeat('1', 64)) $$,
  '23514', null, 'Una tarifa inventada se rechaza');
select throws_ok($$ select public.alta_cliente('00000000-0000-0000-0000-0000000000d1', '{"nombre": "X", "programa_semanas": "doce"}', current_date, repeat('2', 64)) $$,
  '22023', null, 'Una duración que no es un número se rechaza');
select throws_ok($$ select public.alta_cliente('00000000-0000-0000-0000-0000000000d1', '{"nombre": "X", "precio": "-5"}', current_date, repeat('3', 64)) $$,
  '22023', null, 'Un precio negativo se rechaza');
reset role;

update public.clientes set user_id = '00000000-0000-0000-0000-0000000000a1' where nombre = 'Con tarifa';

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ update public.clientes set tarifa = 'anual', precio = 500 where nombre = 'Con tarifa' $$,
  'El equipo puede cambiar la tarifa y el precio');
select lives_ok($$ update public.clientes set inicio_programa = current_date - 14 where nombre = 'Con tarifa' $$,
  'El equipo puede mover el inicio del programa');
reset role;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ update public.clientes set precio = 0 returning 1 $$,
  'El cliente no puede cambiarse el precio');
reset role;

select * from finish();
rollback;

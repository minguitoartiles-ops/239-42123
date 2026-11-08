-- =====================================================================
-- Pruebas: cuenta del cliente (correo, aviso) y cuestionario en «salud» · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'Ana@Prueba.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@prueba.local');
insert into public.equipo (user_id, nombre, rol) values ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador');
select public.alta_cliente('00000000-0000-0000-0000-0000000000d1', '{"nombre": "Ana"}', current_date + 30, repeat('a', 64));
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'B', current_date + 30);
insert into public.salud (cliente_id) values ('00000000-0000-0000-0000-0000000000cb');

select is((select email from public.clientes where nombre = 'Ana'), null, 'En el alta no hace falta el correo');
select ok(public.vincular_cliente(repeat('a', 64), '00000000-0000-0000-0000-0000000000a1') is not null, 'Ana crea su cuenta');
select results_eq($$ select email, cuenta_desde is not null from public.clientes where nombre = 'Ana' $$,
  $$ values ('ana@prueba.local'::text, true) $$, 'Su ficha toma el correo de la cuenta y cuándo entró');

-- Ana rellena su cuestionario
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ update public.salud set datos = '{"cuestionario": {"fecha": "2026-11-08", "v": "V5", "r": {"telefono": "+34600111222", "peso": "70"}}}' $$,
  'Guarda su cuestionario');
select results_eq($$ select count(*)::int from public.salud $$, $$ values (1) $$, 'Solo ve el suyo');
select is_empty($$ update public.salud set datos = '{}' where cliente_id = '00000000-0000-0000-0000-0000000000cb' returning 1 $$, 'No toca el de otro');
select is_empty($$ update public.clientes set email = 'otro@x.es' returning 1 $$, 'No cambia su ficha');
reset role;

-- Domingo lo lee
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select is((select datos -> 'cuestionario' -> 'r' ->> 'telefono' from public.salud s join public.clientes c on c.id = s.cliente_id where c.nombre = 'Ana'),
  '+34600111222', 'El equipo ve su cuestionario (y su teléfono)');
select is_empty($$ update public.salud set datos = '{}' returning 1 $$, 'Pero no lo cambia');
reset role;

select * from finish();
rollback;

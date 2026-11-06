-- =====================================================================
-- Pruebas de los consentimientos en el servidor · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@prueba.local');
insert into public.equipo (user_id, nombre, rol) values ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador');
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'A', current_date + 20),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'B', current_date + 20);

-- ---------- Ana da su consentimiento ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local request.headers = '{"x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "Prueba/1.0"}';
set local role authenticated;
select lives_ok($$ insert into public.consentimientos (tipo, dado, version) values ('salud', true, '2026-11-06') $$, 'Ana da su consentimiento de salud');
select lives_ok($$ insert into public.consentimientos (tipo, dado, version, detalle) values ('imagen', true, '2026-11-06', '{"progreso": true, "nombre": false, "otra": "cosa"}') $$, 'Y decide sobre su imagen');
select throws_ok($$ insert into public.consentimientos (cliente_id, tipo, dado, version) values ('00000000-0000-0000-0000-0000000000cb', 'salud', true, 'x') $$,
  '42501', null, 'No puede apuntar nada a nombre de otro cliente');
select throws_ok($$ update public.consentimientos set dado = false $$, '42501', null, 'Lo apuntado no se cambia');
select throws_ok($$ delete from public.consentimientos $$, '42501', null, 'Ni se borra');
select throws_ok($$ insert into public.consentimientos (tipo, dado, version) values ('otro', true, 'x') $$, '23514', null, 'Solo los tipos conocidos');
select lives_ok($$ insert into public.consentimientos (tipo, dado, version) values ('salud', false, '2026-11-06') $$, 'Lo retira (otro apunte)');
reset role;
select results_eq($$ select cliente_id, user_id, ip, navegador from public.consentimientos where tipo = 'salud' order by fecha, dado desc limit 1 $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca'::uuid, '00000000-0000-0000-0000-0000000000a1'::uuid, '203.0.113.7'::text, 'Prueba/1.0'::text) $$,
  'Queda de quién es, desde qué IP y navegador (lo pone el servidor)');
select is((select detalle from public.consentimientos where tipo = 'imagen'), '{"nombre": false, "progreso": true, "reconocible": false}'::jsonb,
  'De la imagen solo se guarda qué autoriza');
select is((select count(*)::int from public.consentimientos where cliente_id = '00000000-0000-0000-0000-0000000000ca'), 3, 'Tres apuntes, ninguno pisado');

-- ---------- Beto no ve los de Ana; Domingo sí ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ select 1 from public.consentimientos $$, 'Otro cliente no ve los de Ana');
reset role;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.consentimientos $$, $$ values (3) $$, 'Domingo los ve');
select throws_ok($$ insert into public.consentimientos (tipo, dado, version) values ('salud', true, 'x') $$, '42501', null, 'Pero no los apunta por el cliente');
reset role;

-- ---------- Si se borra la ficha, se van con ella ----------
delete from public.clientes where id = '00000000-0000-0000-0000-0000000000ca';
select is_empty($$ select 1 from public.consentimientos $$, 'Al borrar la ficha se borran sus consentimientos');

select * from finish();
rollback;

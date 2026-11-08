-- =====================================================================
-- Pruebas de los consentimientos en el servidor · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@prueba.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'c@prueba.local');
insert into public.equipo (user_id, nombre, rol) values ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador');
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'A', current_date + 20),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'B', current_date + 20),
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-0000000000c1', 'C', current_date - 30);   -- sin acceso

-- ---------- A da su consentimiento ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.consentimientos (tipo, estado, version) values ('salud', 'dado', '2026-10-19-2') $$, 'A da su consentimiento de salud');
select results_eq($$ select cliente_id, user_id, detalle from public.consentimientos $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca'::uuid, '00000000-0000-0000-0000-0000000000a1'::uuid, null::jsonb) $$,
  'De quién es lo pone el servidor');
select throws_ok($$ insert into public.consentimientos (cliente_id, tipo, estado, version) values ('00000000-0000-0000-0000-0000000000cb', 'salud', 'dado', 'v1') $$,
  '42501', null, 'No lo registra por otro cliente (no puede ni elegir la ficha)');
select lives_ok($$ insert into public.consentimientos (tipo, estado, version, detalle) values ('imagen', 'dado', 'v1', '{"progreso": true, "reconocible": false, "nombre": false}') $$,
  'Da su permiso de imagen');
select throws_ok($$ insert into public.consentimientos (tipo, estado, version, detalle) values ('imagen', 'dado', 'v1', '{"todo": true}') $$,
  '23514', null, 'Permisos de imagen raros, no');
select throws_ok($$ insert into public.consentimientos (tipo, estado, version) values ('salud', 'dado', 'v 1; drop') $$,
  '23514', null, 'Versión rara, no');
select throws_ok($$ update public.consentimientos set estado = 'retirado' $$, '42501', null, 'No se cambia');
select throws_ok($$ delete from public.consentimientos $$, '42501', null, 'Ni se borra');
select lives_ok($$ insert into public.consentimientos (tipo, estado, version) values ('salud', 'retirado', 'v1') $$, 'Lo retira (queda apuntado)');
select results_eq($$ select count(*)::int from public.consentimientos $$, $$ values (3) $$, 'Ve los suyos');
reset role;

-- ---------- B no ve los de A ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ select 1 from public.consentimientos $$, 'Otro cliente no los ve');
reset role;

-- ---------- C, sin acceso ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ insert into public.consentimientos (tipo, estado, version) values ('salud', 'dado', 'v1') $$, '42501', null,
  'Sin acceso no registra nada');
reset role;

-- ---------- Domingo ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.consentimientos $$, $$ values (3) $$, 'El equipo los ve todos');
select throws_ok($$ insert into public.consentimientos (tipo, estado, version) values ('salud', 'dado', 'v1') $$, '42501', null,
  'Pero no los da por el cliente');
reset role;

select * from finish();
rollback;

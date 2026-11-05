-- =====================================================================
-- Pruebas del paso 5: seguimientos, lo que hace cada profesional e historial · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'fatima@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'ana@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'beto@prueba.local'),
  ('00000000-0000-0000-0000-0000000000e1', 'eva@prueba.local');
insert into public.equipo (user_id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador'),
  ('00000000-0000-0000-0000-0000000000f1', 'Fátima', 'dietista');
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'Ana', current_date + 30),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'Beto', current_date + 30),
  ('00000000-0000-0000-0000-0000000000ce', '00000000-0000-0000-0000-0000000000e1', 'Eva', current_date - 3);    -- en el margen de impago
insert into public.seguimientos (id, cliente_id, fecha, datos) values
  ('00000000-0000-0000-0000-0000000005a0', '00000000-0000-0000-0000-0000000000ca', current_date - 14, '{"peso": "80"}');

-- ---------- Ana (cliente) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.seguimientos (id, cliente_id, fecha, datos)
  values ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000000ca', current_date, '{"peso": "79"}') $$,
  'El cliente envía el seguimiento de esta semana');
select results_eq($$ select semana from public.seguimientos where id = '00000000-0000-0000-0000-0000000005a1' $$,
  $$ values (to_char(current_date, 'IYYY-"W"IW')) $$, 'La semana la calcula el servidor');
select throws_ok($$ insert into public.seguimientos (cliente_id, fecha, datos) values ('00000000-0000-0000-0000-0000000000ca', current_date, '{}') $$,
  '23505', null, 'Solo uno por semana');
select isnt_empty($$ update public.seguimientos set datos = '{"peso": "78,5"}' where id = '00000000-0000-0000-0000-0000000005a1' returning 1 $$,
  'Corrige el de esta semana');
select results_eq($$ select editado is not null, datos ->> 'peso' from public.seguimientos where id = '00000000-0000-0000-0000-0000000005a1' $$,
  $$ values (true, '78,5'::text) $$, 'Queda marcado como editado');
select throws_ok($$ update public.seguimientos set datos = '{"peso": "1"}' where id = '00000000-0000-0000-0000-0000000005a0' $$,
  '42501', null, 'No puede corregir el de una semana anterior');
select throws_ok($$ update public.seguimientos set revisado = true where id = '00000000-0000-0000-0000-0000000005a1' $$,
  '42501', null, 'No puede marcarlo como revisado');
select throws_ok($$ update public.seguimientos set fecha = current_date - 30 where id = '00000000-0000-0000-0000-0000000005a1' $$,
  '42501', null, 'No puede cambiarle la fecha');
select throws_ok($$ insert into public.seguimientos (cliente_id, datos) values ('00000000-0000-0000-0000-0000000000cb', '{}') $$,
  '42501', null, 'No puede enviar un seguimiento a nombre de otro');
select is_empty($$ select 1 from public.seguimiento_equipo $$, 'No ve lo que hace el equipo con sus seguimientos');
select throws_ok($$ insert into public.seguimiento_equipo (seguimiento_id, revisado) values ('00000000-0000-0000-0000-0000000005a1', now()) $$,
  '42501', null, 'No puede marcar sus seguimientos como revisados');
select lives_ok($$ insert into public.historial (cliente_id, datos) values ('00000000-0000-0000-0000-0000000000ca', '{"ton": [{"sem": "2026-10-26", "kg": 4200}]}')
  on conflict (cliente_id) do update set cliente_id = excluded.cliente_id, datos = excluded.datos $$,
  'Guarda su historial (y lo vuelve a guardar)');
select throws_ok($$ insert into public.historial (cliente_id, datos) values ('00000000-0000-0000-0000-0000000000cb', '{}') $$,
  '42501', null, 'No escribe en el historial de otro');
reset role;

-- ---------- Beto: el día que manda el móvil tiene que cuadrar con hoy ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.seguimientos (id, cliente_id, fecha, datos)
  values ('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-0000000000cb', current_date - 30, '{}') $$,
  'Un seguimiento con una fecha inventada se acepta…');
select results_eq($$ select fecha from public.seguimientos where id = '00000000-0000-0000-0000-0000000005b1' $$,
  $$ values (current_date) $$, '…pero cuenta con la fecha de hoy');
reset role;

-- ---------- Eva (margen de impago) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ insert into public.historial (cliente_id, datos) values ('00000000-0000-0000-0000-0000000000ce', '{}') $$,
  '42501', null, 'En el margen de impago no guarda historial');
reset role;

-- ---------- Domingo ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.seguimientos $$, $$ values (3) $$, 'El equipo ve todos los seguimientos');
select is_empty($$ update public.seguimientos set datos = '{}' returning 1 $$, 'El equipo no cambia lo que escribió el cliente');
select lives_ok($$ insert into public.seguimiento_equipo (seguimiento_id, visto) values ('00000000-0000-0000-0000-0000000005a1', now()) $$,
  'Domingo lo marca como visto');
select lives_ok($$ insert into public.seguimiento_equipo (seguimiento_id, revisado, comentario)
  values ('00000000-0000-0000-0000-0000000005a1', now() - interval '1 day', 'Muy bien')
  on conflict (seguimiento_id, user_id) do update set seguimiento_id = excluded.seguimiento_id, revisado = excluded.revisado, comentario = excluded.comentario $$,
  'Y lo completa con un comentario');
select results_eq($$ select user_id, cliente_id, visto is not null, revisado = now(), comentario from public.seguimiento_equipo $$,
  $$ values ('00000000-0000-0000-0000-0000000000d1'::uuid, '00000000-0000-0000-0000-0000000000ca'::uuid, true, true, 'Muy bien'::text) $$,
  'Quién, de qué cliente y cuándo lo pone el servidor');
select lives_ok($$ update public.seguimiento_equipo set revisado = null $$, '«Deshacer» la revisión');
select results_eq($$ select revisado, comentario, visto is not null from public.seguimiento_equipo $$,
  $$ values (null::timestamptz, null::text, true) $$, 'Sin revisión no queda comentario, y sigue como visto');
select throws_ok($$ insert into public.historial (cliente_id, datos) values ('00000000-0000-0000-0000-0000000000ca', '{}') $$,
  '42501', null, 'El equipo no escribe en el historial del cliente');
select results_eq($$ select (datos -> 'ton' -> 0 ->> 'kg')::int from public.historial $$, $$ values (4200) $$,
  'Pero lo lee');
reset role;

-- ---------- Fátima ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ update public.seguimiento_equipo set revisado = now() returning 1 $$,
  'Fátima ve lo de Domingo, pero no lo cambia');
reset role;

-- ---------- Servidor ----------
set local request.jwt.claims = '';
select results_eq($$ insert into public.seguimientos (cliente_id, fecha) values ('00000000-0000-0000-0000-0000000000cb', current_date - 21) returning semana $$,
  $$ values (to_char(current_date - 21, 'IYYY-"W"IW')) $$, 'El servidor puede guardar seguimientos de otras semanas');

select * from finish();
rollback;

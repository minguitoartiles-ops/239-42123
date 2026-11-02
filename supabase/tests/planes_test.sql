-- =====================================================================
-- Pruebas del paso 3: pautas y registros (entreno y nutrición) · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

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
  ('00000000-0000-0000-0000-0000000000ce', '00000000-0000-0000-0000-0000000000e1', 'Eva', current_date - 3);   -- en el margen de impago
insert into public.planes_entreno (cliente_id) values ('00000000-0000-0000-0000-0000000000ca'), ('00000000-0000-0000-0000-0000000000cb');
insert into public.planes_nutricion (cliente_id) values ('00000000-0000-0000-0000-0000000000ca'), ('00000000-0000-0000-0000-0000000000cb');
insert into public.registro_nutricion (cliente_id, semana, datos) values
  ('00000000-0000-0000-0000-0000000000cb', '2026-W44', '{"comidas": {}}');

-- ---------- Ana (cliente) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.registro_nutricion (cliente_id, semana, datos)
  values ('00000000-0000-0000-0000-0000000000ca', '2026-W45', '{"comidas": {"m1": {"tomada": "1"}}}') $$,
  'El cliente guarda lo que marca en nutrición');
select lives_ok($$ insert into public.registro_nutricion (cliente_id, semana, datos)
  values ('00000000-0000-0000-0000-0000000000ca', '2026-W45', '{"comidas": {}}')
  on conflict (cliente_id, semana) do update set datos = excluded.datos $$,
  'Y lo vuelve a guardar en la misma semana (upsert)');
select lives_ok($$ insert into public.registro_entreno (cliente_id, semana, datos)
  values ('00000000-0000-0000-0000-0000000000ca', '2026-W45', '{"sesiones": {}}')
  on conflict (cliente_id, semana) do update set datos = excluded.datos $$,
  'También el registro de entreno se guarda con upsert');
select throws_ok($$ insert into public.registro_nutricion (cliente_id, semana, datos)
  values ('00000000-0000-0000-0000-0000000000cb', '2026-W45', '{}') $$,
  '42501', null, 'No puede escribir en el registro de otro cliente');
select results_eq($$ select cliente_id from public.registro_nutricion $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca'::uuid) $$, 'Solo ve su registro de nutrición');
select results_eq($$ select cliente_id from public.planes_nutricion $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca'::uuid) $$, 'Solo ve su plan de nutrición');
select is_empty($$ update public.planes_nutricion set pauta = '{"comidas": [1]}' returning 1 $$,
  'No puede cambiar su pauta de nutrición');
select is_empty($$ update public.planes_entreno set pauta = '{"sesiones": [1]}' returning 1 $$,
  'No puede cambiar su pauta de entreno');
select throws_ok($$ update public.registro_nutricion set cliente_id = '00000000-0000-0000-0000-0000000000cb' $$,
  '42501', null, 'No puede pasar su registro a otro cliente');
select throws_ok($$ insert into public.registro_nutricion (cliente_id, semana) values ('00000000-0000-0000-0000-0000000000ca', 'semana 45') $$,
  '23514', null, 'La semana tiene que ir en formato ISO');
reset role;

-- ---------- Eva (en el margen de impago: solo «cómo pagar» y chat) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ insert into public.registro_nutricion (cliente_id, semana, datos)
  values ('00000000-0000-0000-0000-0000000000ce', '2026-W45', '{}') $$,
  '42501', null, 'En el margen de impago no guarda registros');
select is_empty($$ select 1 from public.planes_entreno $$, 'En el margen de impago no ve el plan');
reset role;

-- ---------- Domingo (entrenador) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select isnt_empty($$ update public.planes_entreno set pauta = '{"sesiones": [{"titulo": "Día 1"}]}'
  where cliente_id = '00000000-0000-0000-0000-0000000000ca' returning 1 $$, 'El entrenador cambia la pauta de entreno');
select is_empty($$ update public.planes_nutricion set pauta = '{"comidas": [1]}' returning 1 $$,
  'El entrenador no cambia la pauta de nutrición');
select results_eq($$ select count(*)::int from public.registro_nutricion $$, $$ values (2) $$,
  'El equipo lee los registros de todos');
select throws_ok($$ insert into public.registro_nutricion (cliente_id, semana, datos)
  values ('00000000-0000-0000-0000-0000000000ca', '2026-W46', '{}') $$,
  '42501', null, 'El equipo no escribe en el registro del cliente');
select is_empty($$ update public.registro_nutricion set datos = '{}' returning 1 $$,
  'El equipo no cambia lo que ha marcado el cliente');
reset role;

-- ---------- Fátima (dietista) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select isnt_empty($$ update public.planes_nutricion set pauta = '{"comidas": [{"titulo": "Desayuno"}]}'
  where cliente_id = '00000000-0000-0000-0000-0000000000ca' returning 1 $$, 'La dietista cambia la pauta de nutrición');
select is_empty($$ update public.planes_entreno set pauta = '{"sesiones": []}' returning 1 $$,
  'La dietista no cambia la pauta de entreno');
reset role;

select is((select actualizado_por from public.planes_nutricion where cliente_id = '00000000-0000-0000-0000-0000000000ca'),
  '00000000-0000-0000-0000-0000000000f1'::uuid, 'Queda apuntado quién cambió la pauta');

-- ---------- Sin sesión ----------
set local role anon;
select throws_ok($$ select 1 from public.registro_nutricion $$, '42501', null, 'Sin sesión no se lee nada');
reset role;

select ok(exists (select 1 from pg_policies where tablename = 'registro_nutricion'), 'La tabla nueva tiene políticas RLS');

select * from finish();
rollback;

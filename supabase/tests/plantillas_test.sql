-- =====================================================================
-- Pruebas de las plantillas en el servidor · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'fatima@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local');
insert into public.equipo (user_id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador'),
  ('00000000-0000-0000-0000-0000000000f1', 'Fátima', 'dietista');
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'A', current_date + 20);

-- ---------- Domingo ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.plantillas (area, nombre, contenido) values ('entreno', 'Torso/Pierna', '{"v": "<div>plan</div>"}') $$, 'Domingo guarda una plantilla de entreno');
select results_eq($$ select user_id from public.plantillas $$, $$ values ('00000000-0000-0000-0000-0000000000d1'::uuid) $$, 'De quién es lo pone el servidor');
select throws_ok($$ insert into public.plantillas (area, nombre, contenido) values ('nutricion', 'Dieta', '{"v": "x"}') $$, '42501', null, 'Domingo no guarda de nutrición');
select throws_ok($$ insert into public.plantillas (user_id, area, nombre, contenido) values ('00000000-0000-0000-0000-0000000000f1', 'entreno', 'Colada', '{"v": "x"}') $$, '42501', null, 'No la guarda a nombre de otro (no puede ni elegirlo)');
select throws_ok($$ insert into public.plantillas (area, nombre, contenido) values ('entreno', 'Torso/Pierna', '{"v": "otra"}') $$, '23505', null, 'No repite el nombre');
select lives_ok($$ update public.plantillas set contenido = '{"v": "<div>nuevo</div>"}' where nombre = 'Torso/Pierna' $$, 'La cambia');
select throws_ok($$ update public.plantillas set nombre = 'Otro' $$, '42501', null, 'No cambia el nombre (se crea otra)');
select lives_ok($$ update public.plantillas set archivada = true where nombre = 'Torso/Pierna' $$, 'La archiva');
select throws_ok($$ delete from public.plantillas $$, '42501', null, 'No se borra desde la app');
reset role;

-- ---------- Fátima ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.plantillas (area, nombre, contenido) values ('nutricion', 'Definición', '{"v": {"html": "<div>x</div>"}}') $$, 'Fátima guarda una de nutrición');
select results_eq($$ select nombre from public.plantillas $$, $$ values ('Definición'::text) $$, 'Fátima solo ve las suyas');
select is_empty($$ update public.plantillas set archivada = true where nombre = 'Torso/Pierna' returning 1 $$, 'Y no toca las de Domingo');
reset role;

-- ---------- un cliente ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ select 1 from public.plantillas $$, 'Un cliente no ve ninguna');
select throws_ok($$ insert into public.plantillas (area, nombre, contenido) values ('entreno', 'X', '{"v": "x"}') $$, '42501', null, 'Ni guarda');
reset role;

select * from finish();
rollback;

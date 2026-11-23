-- =====================================================================
-- «Mis notas» de los profesionales (23/11/2026) · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'fatima@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local');
insert into public.equipo (user_id, nombre, rol, admin) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador', true),
  ('00000000-0000-0000-0000-0000000000f1', 'Fátima', 'dietista', false);
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'A', current_date + 30);

-- Domingo apunta dos notas
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.notas_equipo (texto, fecha) values ('  Competición de Pedro  ', current_date + 10) $$,
  'Domingo apunta una nota con fecha');
select lives_ok($$ insert into public.notas_equipo (texto) values ('Cambiar el plan de A') $$, 'Y otra sin fecha');
select results_eq($$ select autor, texto from public.notas_equipo where fecha is not null $$,
  $$ values ('00000000-0000-0000-0000-0000000000d1'::uuid, 'Competición de Pedro') $$,
  'El dueño lo pone el servidor y el texto se guarda sin espacios sobrantes');
select throws_ok($$ insert into public.notas_equipo (autor, texto) values ('00000000-0000-0000-0000-0000000000f1', 'En nombre de Fátima') $$,
  '42501', null, 'Nadie apunta en nombre de otro');
select throws_ok($$ insert into public.notas_equipo (texto) values ('   ') $$, '23514', null, 'Una nota no puede estar vacía');
select lives_ok($$ update public.notas_equipo set hecha = true where texto = 'Cambiar el plan de A' $$, 'La marca como hecha');
reset role;

-- Fátima no ve ni toca las de Domingo
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.notas_equipo $$, $$ values (0) $$, 'Fátima no ve las notas de Domingo');
select results_eq($$ with u as (update public.notas_equipo set texto = 'x' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'Ni las cambia');
select results_eq($$ with b as (delete from public.notas_equipo returning 1) select count(*)::int from b $$,
  $$ values (0) $$, 'Ni las borra');
select lives_ok($$ insert into public.notas_equipo (texto) values ('Lo mío') $$, 'Fátima tiene las suyas');
reset role;

-- un cliente no puede tener notas ni ver las del equipo
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.notas_equipo $$, $$ values (0) $$, 'Un cliente no ve ninguna nota');
select throws_ok($$ insert into public.notas_equipo (texto) values ('hola') $$, '42501', null, 'Ni las escribe');
reset role;

-- suspendido: deja de verlas
update public.equipo set activo = false where user_id = '00000000-0000-0000-0000-0000000000d1';
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.notas_equipo $$, $$ values (0) $$, 'Un miembro suspendido no ve sus notas');
reset role;

set local role anon;
select throws_ok($$ select * from public.notas_equipo $$, '42501', null, 'Sin sesión no se ve nada');
reset role;

select * from finish();
rollback;

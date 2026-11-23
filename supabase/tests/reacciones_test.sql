-- =====================================================================
-- Reacciones del chat (23/11/2026) · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'fatima@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@prueba.local');
insert into public.equipo (user_id, nombre, rol, admin) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador', true),
  ('00000000-0000-0000-0000-0000000000f1', 'Fátima', 'dietista', false);
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'A', current_date + 30),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'B', current_date + 30);

-- un mensaje del cliente A y otro del cliente B
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
insert into public.mensajes (id, cliente_id, lado, texto) values
  ('00000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-0000000000ca', 'out', 'Hola');
reset role;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';
set local role authenticated;
insert into public.mensajes (id, cliente_id, lado, texto) values
  ('00000000-0000-0000-0000-00000000bbb1', '00000000-0000-0000-0000-0000000000cb', 'out', 'Buenas');
reset role;

-- Domingo reacciona al mensaje de A
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.reacciones (mensaje_id, emoji) values ('00000000-0000-0000-0000-00000000aaa1', '👍') $$,
  'El equipo reacciona a un mensaje');
select results_eq($$ select autor, cliente_id from public.reacciones $$,
  $$ values ('00000000-0000-0000-0000-0000000000d1'::uuid, '00000000-0000-0000-0000-0000000000ca'::uuid) $$,
  'El autor y el chat los pone el servidor');
select lives_ok($$ insert into public.reacciones (mensaje_id, emoji) values ('00000000-0000-0000-0000-00000000aaa1', '❤️')
                   on conflict (mensaje_id, autor) do update set emoji = excluded.emoji $$,
  'Poner otra la cambia (una por persona y mensaje)');
select results_eq($$ select count(*)::int, max(emoji) from public.reacciones $$, $$ values (1, '❤️') $$, 'Sigue habiendo una sola');
select throws_ok($$ insert into public.reacciones (mensaje_id, emoji) values ('00000000-0000-0000-0000-00000000bbb1', '🍕') $$,
  '23514', null, 'Solo los emoticonos de la lista');
reset role;

-- el cliente A
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.reacciones $$, $$ values (1) $$, 'A ve las reacciones de su chat');
select lives_ok($$ insert into public.reacciones (mensaje_id, emoji) values ('00000000-0000-0000-0000-00000000aaa1', '😂') $$,
  'A reacciona en su chat');
select throws_ok($$ insert into public.reacciones (mensaje_id, emoji) values ('00000000-0000-0000-0000-00000000bbb1', '😂') $$,
  '42501', null, 'A no reacciona en el chat de B');
select throws_ok($$ insert into public.reacciones (mensaje_id, autor, emoji) values ('00000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-0000000000b1', '👍') $$,
  '42501', null, 'Nadie reacciona en nombre de otro');
select results_eq($$ with u as (update public.reacciones set emoji = null returning 1) select count(*)::int from u $$,
  $$ values (1) $$, 'A solo puede cambiar (o quitar) la suya');
select throws_ok($$ update public.reacciones set mensaje_id = '00000000-0000-0000-0000-00000000bbb1' $$,
  '23514', null, 'Una reacción no se cambia de mensaje');
reset role;

-- el cliente B no ve el chat de A
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select count(*)::int from public.reacciones $$, $$ values (0) $$, 'B no ve las reacciones del chat de A');
reset role;

-- visitante
set local role anon;
select throws_ok($$ select * from public.reacciones $$, '42501', null, 'Sin sesión no se ve nada');
reset role;

-- al eliminar el mensaje, se quitan sus reacciones; y a un mensaje eliminado no se reacciona
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
update public.mensajes set eliminado = true, texto = null where id = '00000000-0000-0000-0000-00000000aaa1';
reset role;
select results_eq($$ select count(*)::int from public.reacciones $$, $$ values (0) $$, 'Al eliminar el mensaje se quitan sus reacciones');
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ insert into public.reacciones (mensaje_id, emoji) values ('00000000-0000-0000-0000-00000000aaa1', '👍') $$,
  '23514', null, 'A un mensaje eliminado no se reacciona');
reset role;

select ok((select relrowsecurity from pg_class where oid = 'public.reacciones'::regclass), 'reacciones con RLS');

select * from finish();
rollback;

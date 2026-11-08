-- =====================================================================
-- Pruebas de «Marcar como resuelto» en el servidor · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'fatima@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'beto@prueba.local');
insert into public.equipo (user_id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador'),
  ('00000000-0000-0000-0000-0000000000f1', 'Fátima', 'dietista');
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'Beto', current_date + 30);
set local session_replication_role = replica;          -- sin triggers: así se puede poner una hora pasada (el servidor pone siempre la actual)
insert into public.mensajes (id, cliente_id, autor, lado, texto, fecha) values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'out', 'Hola, soy Beto', now() - interval '3 hours');
set local session_replication_role = origin;

-- ---------- Domingo lo da por resuelto ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select espera_desde is not null from public.resumen_chats() $$, $$ values (true) $$, 'Beto espera respuesta');
select lives_ok($$ insert into public.chat_lecturas (cliente_id, resuelto) values ('00000000-0000-0000-0000-0000000000cb', now() - interval '1 hour')
  on conflict (user_id, cliente_id) do update set cliente_id = excluded.cliente_id, resuelto = excluded.resuelto $$,
  'Domingo lo marca como resuelto');
select results_eq($$ select espera_desde is null from public.resumen_chats() $$, $$ values (true) $$, 'Ya no sale «sin contestar» para Domingo');
select lives_ok($$ update public.chat_lecturas set resuelto = now() + interval '5 days' $$, 'Intenta ponerlo en el futuro');
select results_eq($$ select resuelto <= now() from public.chat_lecturas $$, $$ values (true) $$, 'El servidor no lo deja en el futuro');
select lives_ok($$ update public.chat_lecturas set resuelto = now() - interval '10 days' $$, 'Intenta echarlo hacia atrás');
select results_eq($$ select resuelto > now() - interval '2 hours' from public.chat_lecturas $$, $$ values (true) $$, 'Tampoco va hacia atrás');
reset role;

-- ---------- Fátima sigue viendo la espera (es cosa de cada uno) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select espera_desde is not null from public.resumen_chats() $$, $$ values (true) $$, 'Para Fátima sigue esperando');
select is_empty($$ select 1 from public.chat_lecturas $$, 'Y no ve lo que ha marcado Domingo');
reset role;

-- ---------- el cliente vuelve a escribir: vuelve a contar para Domingo ----------
set local session_replication_role = replica;
insert into public.mensajes (cliente_id, autor, lado, texto, fecha) values
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'out', 'Una cosa más', now() + interval '1 minute');
set local session_replication_role = origin;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select espera_desde is not null from public.resumen_chats() $$, $$ values (true) $$, 'Si el cliente escribe después, vuelve a contar');
reset role;

select * from finish();
rollback;

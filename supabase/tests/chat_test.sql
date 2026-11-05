-- =====================================================================
-- Pruebas del paso 4: el chat (mensajes, fijado, dudas, lecturas y nombres) · supabase test db
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(49);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'fatima@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'ana@prueba.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'beto@prueba.local'),
  ('00000000-0000-0000-0000-0000000000e1', 'eva@prueba.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'carla@prueba.local'),
  ('00000000-0000-0000-0000-000000000099', 'nadie@prueba.local');
insert into public.equipo (user_id, nombre, rol) values
  ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador'),
  ('00000000-0000-0000-0000-0000000000f1', 'Fátima', 'dietista');
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'Ana', current_date + 30),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'Beto', current_date + 30),
  ('00000000-0000-0000-0000-0000000000ce', '00000000-0000-0000-0000-0000000000e1', 'Eva', current_date - 3),    -- en el margen de impago
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-0000000000c1', 'Carla', current_date - 10); -- ya sin acceso
insert into public.mensajes (id, cliente_id, autor, lado, texto) values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000b1', 'out', 'Hola, soy Beto'),
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000d1', 'in', 'Hola Ana, soy Domingo');
insert into public.chat_lecturas (user_id, cliente_id, hasta) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000ca', now());

-- ---------- Ana (cliente) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.mensajes (id, cliente_id, lado, texto, reenviado, etiqueta)
  values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000ca', 'out', 'Hola equipo', true, 'revision') $$,
  'El cliente escribe en su chat');
select results_eq($$ select reenviado, etiqueta from public.mensajes where id = '00000000-0000-0000-0000-00000000a001' $$,
  $$ values (false, null::text) $$, 'El cliente no puede marcar un mensaje como reenviado ni como revisión');
select results_eq($$ select autor from public.mensajes where id = '00000000-0000-0000-0000-00000000a001' $$,
  $$ values ('00000000-0000-0000-0000-0000000000a1'::uuid) $$, 'El autor lo pone el servidor');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, texto) values ('00000000-0000-0000-0000-0000000000ca', 'in', 'Soy el equipo') $$,
  '42501', null, 'El cliente no puede escribir como si fuera el equipo');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, texto) values ('00000000-0000-0000-0000-0000000000cb', 'out', 'Hola Beto') $$,
  '42501', null, 'El cliente no puede escribir en el chat de otro');
select throws_ok($$ insert into public.mensajes (id, cliente_id, lado, texto) values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000ca', 'out', 'Repetido') $$,
  '23505', null, 'Un mensaje reenviado sin conexión no se duplica (mismo id)');
select results_eq($$ select count(*)::int from public.mensajes $$, $$ values (2) $$, 'Solo ve los mensajes de su chat');
select is_empty($$ update public.mensajes set eliminado = true, texto = null where id = '00000000-0000-0000-0000-00000000d001' returning 1 $$,
  'No puede borrar los mensajes del equipo');
select throws_ok($$ update public.mensajes set texto = 'Cambiado' where id = '00000000-0000-0000-0000-00000000a001' $$,
  '42501', null, 'Un mensaje no se puede editar');
select lives_ok($$ insert into public.chat_fijado (cliente_id, mensaje_id) values ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-00000000d001') $$,
  'El cliente fija un mensaje de su chat');
select results_eq($$ select por from public.chat_fijado $$, $$ values ('00000000-0000-0000-0000-0000000000a1'::uuid) $$,
  'Quién lo fijó lo pone el servidor');
select throws_ok($$ insert into public.chat_fijado (cliente_id, mensaje_id) values ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-00000000b001') $$,
  '42501', null, 'No puede fijar en el chat de otro');
select throws_ok($$ update public.chat_fijado set mensaje_id = '00000000-0000-0000-0000-00000000b001' $$,
  '23514', null, 'No puede fijar un mensaje de otro chat en el suyo');
select is_empty($$ select 1 from public.dudas $$, 'El cliente no ve las dudas del equipo');
select throws_ok($$ insert into public.dudas (cliente_id, mensaje_id, para) values ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'El cliente no puede crear dudas');
select results_eq($$ select nombre, rol from public.nombres_equipo() $$,
  $$ values ('Domingo'::text, 'entrenador'::text), ('Fátima', 'dietista') $$, 'El cliente ve el nombre y el papel del equipo');
select lives_ok($$ insert into public.chat_lecturas (cliente_id, hasta) values ('00000000-0000-0000-0000-0000000000ca', now() + interval '1 year') $$,
  'El cliente apunta hasta dónde ha leído');
select results_eq($$ select user_id, hasta <= now() from public.chat_lecturas $$,
  $$ values ('00000000-0000-0000-0000-0000000000a1'::uuid, true) $$, 'Solo ve sus lecturas, y nunca en el futuro');
select throws_ok($$ insert into public.chat_lecturas (cliente_id) values ('00000000-0000-0000-0000-0000000000cb') $$,
  '42501', null, 'No apunta lecturas en el chat de otro');
select results_eq($$ select cliente_id, sin_leer, espera_desde from public.resumen_chats() $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca'::uuid, 0, null::timestamptz) $$,
  'El resumen del cliente solo trae su chat, ya leído');
select lives_ok($$ insert into public.chat_lecturas (cliente_id, hasta) values ('00000000-0000-0000-0000-0000000000ca', now())
  on conflict (user_id, cliente_id) do update set cliente_id = excluded.cliente_id, hasta = excluded.hasta $$,
  'La lectura se vuelve a apuntar (upsert)');
reset role;

-- ---------- Eva (margen de impago: el chat sigue abierto) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.mensajes (cliente_id, lado, texto) values ('00000000-0000-0000-0000-0000000000ce', 'out', 'Ya he pagado') $$,
  'En el margen de impago el cliente puede escribir');
select results_eq($$ select count(*)::int from public.nombres_equipo() $$, $$ values (2) $$,
  'En el margen de impago sigue viendo quién le escribe');
reset role;

-- ---------- Carla (ya sin acceso) y una cuenta sin ficha ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}';
set local role authenticated;
select throws_ok($$ insert into public.mensajes (cliente_id, lado, texto) values ('00000000-0000-0000-0000-0000000000cc', 'out', 'Hola') $$,
  '42501', null, 'Sin acceso ya no se puede escribir');
select is_empty($$ select 1 from public.nombres_equipo() $$, 'Sin acceso no ve los nombres del equipo');
reset role;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000099", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ select 1 from public.nombres_equipo() $$, 'Una cuenta sin ficha no ve los nombres del equipo');
select is_empty($$ select 1 from public.chat_fijado $$, 'Una cuenta sin ficha no ve mensajes fijados');
reset role;

-- ---------- Domingo (entrenador) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.mensajes (cliente_id, lado, texto, reenviado, etiqueta)
  values ('00000000-0000-0000-0000-0000000000cb', 'in', 'Revisado tu seguimiento', true, 'revision') $$,
  'El equipo escribe con las marcas de reenviado y revisión');
select results_eq($$ select reenviado, etiqueta from public.mensajes where texto = 'Revisado tu seguimiento' $$,
  $$ values (true, 'revision'::text) $$, 'Las marcas del equipo se guardan');
select lives_ok($$ insert into public.dudas (cliente_id, mensaje_id, para) values (
  '00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000f1') $$,
  'Domingo plantea una duda a Fátima');
select results_eq($$ select de, estado from public.dudas $$, $$ values ('00000000-0000-0000-0000-0000000000d1'::uuid, 'pendiente'::text) $$,
  'Quién la plantea lo pone el servidor');
select throws_ok($$ insert into public.dudas (cliente_id, mensaje_id, para) values ('00000000-0000-0000-0000-0000000000ca',
  '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000f1') $$,
  '23505', null, 'No hay dos dudas pendientes sobre el mismo mensaje');
select throws_ok($$ insert into public.dudas (cliente_id, mensaje_id, para) values ('00000000-0000-0000-0000-0000000000cb',
  '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000d1') $$,
  '23514', null, 'La duda es para el compañero, no para uno mismo');
select throws_ok($$ insert into public.dudas (cliente_id, mensaje_id, para) values ('00000000-0000-0000-0000-0000000000ca',
  '00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000f1') $$,
  '23514', null, 'Solo se marcan como duda mensajes del cliente');
select throws_ok($$ update public.dudas set estado = 'resuelta' $$,
  '42501', null, 'Quien plantea la duda no la marca como resuelta');
select is_empty($$ update public.mensajes set eliminado = true, texto = null where id = '00000000-0000-0000-0000-00000000a001' returning 1 $$,
  'El equipo no borra los mensajes del cliente');
select results_eq($$ select count(*)::int from public.chat_lecturas $$, $$ values (1) $$,
  'Domingo solo ve sus propias lecturas');
select results_eq($$ select cliente_id::text, sin_leer, espera_desde is not null from public.resumen_chats() order by 1 $$,
  $$ values ('00000000-0000-0000-0000-0000000000ca', 0, false), ('00000000-0000-0000-0000-0000000000cb', 1, false),
            ('00000000-0000-0000-0000-0000000000ce', 1, true) $$,
  'El resumen del equipo: sin leer y quién espera respuesta (Beto ya tiene respuesta de Domingo)');
reset role;

-- ---------- Fátima (dietista) ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}';
set local role authenticated;
select is_empty($$ update public.mensajes set eliminado = true, texto = null where id = '00000000-0000-0000-0000-00000000d001' returning 1 $$,
  'Fátima no borra los mensajes de Domingo');
select lives_ok($$ update public.dudas set estado = 'resuelta' where estado = 'pendiente' $$,
  'Fátima resuelve la duda que le han hecho');
select results_eq($$ select estado, cerrada_por from public.dudas $$,
  $$ values ('resuelta'::text, '00000000-0000-0000-0000-0000000000f1'::uuid) $$, 'Queda resuelta y por quién');
select throws_ok($$ update public.dudas set estado = 'pendiente' $$,
  '42501', null, 'Una duda cerrada no se vuelve a abrir');
reset role;

-- ---------- Ana vacía un mensaje fijado y con duda ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
insert into public.dudas (cliente_id, mensaje_id, para) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000f1');
reset role;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
update public.chat_fijado set mensaje_id = '00000000-0000-0000-0000-00000000a001';
select isnt_empty($$ update public.mensajes set eliminado = true, texto = null where id = '00000000-0000-0000-0000-00000000a001' returning 1 $$,
  'El cliente borra su propio mensaje');
select results_eq($$ select mensaje_id from public.chat_fijado $$, $$ values (null::uuid) $$,
  'Un mensaje borrado deja de estar fijado');
select throws_ok($$ update public.chat_fijado set mensaje_id = '00000000-0000-0000-0000-00000000a001' $$,
  '23514', null, 'Un mensaje borrado no se puede fijar');
reset role;
select results_eq($$ select estado from public.dudas order by creada, estado $$,
  $$ values ('quitada'::text), ('resuelta') $$, 'Su duda pendiente se quita sola');

-- ---------- Límite de mensajes seguidos ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.mensajes (cliente_id, lado, texto)
  select '00000000-0000-0000-0000-0000000000ca', 'out', 'Mensaje ' || g from generate_series(1, 19) g $$,
  'Hasta 20 mensajes seguidos sin problema');
select throws_ok($$ insert into public.mensajes (cliente_id, lado, texto) values ('00000000-0000-0000-0000-0000000000ca', 'out', 'Uno más') $$,
  '54000', null, 'El mensaje 21 en un minuto se rechaza');
reset role;

-- ---------- Servidor (avisos automáticos) ----------
set local request.jwt.claims = '';
select lives_ok($$ insert into public.mensajes (cliente_id, lado, texto) values ('00000000-0000-0000-0000-0000000000ca', 'in', 'Aviso automático: prueba') $$,
  'El servidor sigue escribiendo avisos sin límite');

select * from finish();
rollback;

-- =====================================================================
-- Pruebas de la auditoría de seguridad del 9/11/2026 · supabase test db
--   · el cuestionario y las alergias solo se guardan con la forma de la app
--   · lo interno de los pagos no lo ve el cliente
--   · pg_net fuera del esquema public
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'domingo@prueba.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@prueba.local');
insert into public.equipo (user_id, nombre, rol) values ('00000000-0000-0000-0000-0000000000d1', 'Domingo', 'entrenador');
insert into public.clientes (id, user_id, nombre, acceso_hasta) values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000a1', 'A', current_date + 30);
insert into public.salud (cliente_id) values ('00000000-0000-0000-0000-0000000000ca');

-- ---------- 1 · salud ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ update public.salud set datos = '{"cuestionario": {"fecha": "2026-11-09T10:00:00Z", "v": "V5", "r": {"objetivo": "Fuerza", "gastro": ["sii"], "peso": 70}},
  "medIni": {"peso": 70}, "alergias": {"fecha": "2026-11-09", "items": {"leche": "diag", "huevo": "sosp", "soja": ""}, "otras": "melocotón",
  "gastro": {"items": ["sii"], "ninguna": false, "txt": ""}}, "dni": "12345678Z", "nombreFiscal": "A B", "dirFiscal": "Calle 1, Pueblo"}' $$,
  'Lo que guarda la app se acepta');
select throws_ok($$ update public.salud set datos = '{"alergias": {"items": {"leche": "\"><img src=x onerror=alert(1)>"}}}' $$,
  '23514', null, 'Una marca de alergia inventada se rechaza');
select throws_ok($$ update public.salud set datos = '{"alergias": {"items": {"<img src=x>": "diag"}}}' $$,
  '23514', null, 'Un nombre de alergia raro se rechaza');
select throws_ok($$ update public.salud set datos = '{"alergias": {"items": ["leche"]}}' $$,
  '23514', null, 'Las alergias en forma de lista se rechazan');
select throws_ok($$ update public.salud set datos = '{"alergias": {"gastro": {"items": ["<b>x</b>"]}}}' $$,
  '23514', null, 'El digestivo raro se rechaza');
select throws_ok($$ update public.salud set datos = '{"cuestionario": "texto"}' $$,
  '23514', null, 'Un cuestionario que no es un objeto se rechaza');
select throws_ok($$ update public.salud set datos = '{"cuestionario": {"r": ["a"]}}' $$,
  '23514', null, 'Unas respuestas que no son un objeto se rechazan');
select throws_ok($$ update public.salud set datos = '{"otra": 1}' $$,
  '23514', null, 'Una clave que no usa la app se rechaza');
select throws_ok($$ update public.salud set datos = jsonb_build_object('dni', repeat('1', 30)) $$,
  '23514', null, 'Un DNI demasiado largo se rechaza');
reset role;

-- ---------- 2 · pagos ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
insert into public.pagos (id, cliente_id, importe, metodo, nota) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000ca', 50, 'bizum', 'Nota interna');
select results_eq($$ select nota, registrado_por from public.pagos_internos() $$,
  $$ values ('Nota interna'::text, '00000000-0000-0000-0000-0000000000d1'::uuid) $$, 'El equipo lee la nota y quién lo registró');
select results_eq($$ select count(*)::int from public.pagos_internos(array['00000000-0000-0000-0000-0000000001a1'::uuid]) $$,
  $$ values (1) $$, 'También de un pago concreto');
reset role;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select results_eq($$ select importe, metodo from public.pagos $$, $$ values (50.00::numeric, 'bizum'::text) $$, 'El cliente ve su pago');
select throws_ok($$ select nota from public.pagos $$, '42501', null, 'Pero no la nota interna');
select throws_ok($$ select registrado_por, anulado_por, anulado_motivo from public.pagos $$, '42501', null, 'Ni quién lo registró o anuló, ni por qué');
select is_empty($$ select * from public.pagos_internos() $$, 'Y la función del equipo le devuelve una lista vacía');
reset role;
select throws_ok($$ set local role anon; select * from public.pagos_internos() $$, '42501', null, 'Sin sesión no se puede llamar');
reset role;

-- ---------- 4 · límite de escrituras ----------
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ update public.salud set datos = '{}' $$, 'Un cambio normal pasa (y cuenta)');
reset role;
update privado.escrituras set n = 1500 where user_id = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select throws_ok($$ update public.salud set datos = '{}' $$, '54000', null, 'Pasado el límite de 10 minutos, se para');
reset role;
insert into privado.escrituras (user_id, ventana, n)
  values ('00000000-0000-0000-0000-0000000000d1', to_timestamp(floor(extract(epoch from now()) / 600) * 600), 5000);
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.chat_lecturas (cliente_id, hasta) values ('00000000-0000-0000-0000-0000000000ca', now()) $$,
  'El equipo no tiene límite');
reset role;

-- ---------- 3 · pg_net ----------
select ok(not exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
                       where e.extname = 'pg_net' and n.nspname = 'public'), 'pg_net no está en el esquema public');

select * from finish();
rollback;

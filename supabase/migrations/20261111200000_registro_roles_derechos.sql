-- =====================================================================
-- Fitnessindramas · auditoría de seguridad del 11/11/2026
--
--   1. Verificación en dos pasos (TOTP), opcional. Quien la activa queda protegido de verdad: con
--      una sesión de un solo paso la base de datos no le reconoce (ni como equipo ni como cliente).
--   2. Roles y permisos: el equipo tiene un administrador (Domingo) y cada miembro puede estar
--      activo o suspendido. El administrador cambia rol, administración y suspensión desde la app;
--      las altas de miembros nuevos siguen siendo solo desde el panel de Supabase.
--   3. Registro de actividad: quién hizo qué, cuándo y con qué rol. Solo crece (nadie lo cambia ni
--      lo borra, tampoco el equipo) y se vacía solo a los 2 años (decisión de Domingo, 11/11/2026).
--      De los datos de salud se apuntan los nombres de los campos, nunca su contenido.
--   4. Consentimiento de cookies guardado también en el servidor (clientes y equipo).
--   5. Derechos RGPD del cliente: pide acceso, rectificación, supresión, oposición, limitación o
--      portabilidad desde la app; el equipo la atiende con el plazo legal de un mes a la vista.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · Dos pasos: una sesión vale si ha pasado el segundo paso o si la cuenta no lo tiene activo
-- ---------------------------------------------------------------------
create or replace function privado.sesion_segura() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
$$;
revoke all on function privado.sesion_segura() from public, anon;
grant execute on function privado.sesion_segura() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2 · Equipo: administrador y suspensión
-- ---------------------------------------------------------------------
alter table public.equipo add column admin  boolean not null default false;
alter table public.equipo add column activo boolean not null default true;
update public.equipo set admin = true where rol = 'entrenador';     -- Domingo administra

create or replace function privado.es_equipo() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.equipo e where e.user_id = auth.uid() and e.activo)
     and privado.sesion_segura()
$$;

create or replace function privado.mi_rol() returns text
  language sql stable security definer set search_path = ''
as $$
  select e.rol from public.equipo e
   where e.user_id = auth.uid() and e.activo and privado.sesion_segura()
$$;

create or replace function privado.es_admin() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.equipo e where e.user_id = auth.uid() and e.activo and e.admin)
     and privado.sesion_segura()
$$;
revoke all on function privado.es_admin() from public, anon;
grant execute on function privado.es_admin() to authenticated, service_role;

create or replace function privado.mi_cliente() returns uuid
  language sql stable security definer set search_path = ''
as $$
  select c.id from public.clientes c
   where c.user_id = auth.uid() and c.estado = 'activo' and c.acceso_hasta >= current_date
     and privado.sesion_segura()
$$;

create or replace function privado.mi_cliente_limitado() returns uuid
  language sql stable security definer set search_path = ''
as $$
  select c.id from public.clientes c
   where c.user_id = auth.uid() and c.estado = 'activo' and c.acceso_hasta + 7 >= current_date
     and privado.sesion_segura()
$$;

-- El equipo ve también su propio permiso (para saber si administra) aunque esté suspendido no
create or replace function public.permisos_equipo()
  returns table (user_id uuid, nombre text, rol text, admin boolean, activo boolean, dos_pasos boolean, ultimo_acceso timestamptz)
  language sql stable security definer set search_path = ''
as $$
  select e.user_id, e.nombre, e.rol, e.admin, e.activo,
         exists (select 1 from auth.mfa_factors f where f.user_id = e.user_id and f.status = 'verified'),
         u.last_sign_in_at
    from public.equipo e left join auth.users u on u.id = e.user_id
   where (select privado.es_equipo())
   order by e.admin desc, e.nombre
$$;
revoke all on function public.permisos_equipo() from public, anon;
grant execute on function public.permisos_equipo() to authenticated;

-- Solo el administrador. No puede quitarse a sí mismo la administración ni suspenderse, y siempre
-- queda al menos un administrador activo.
create or replace function public.cambiar_permisos(p_user uuid, p_rol text, p_admin boolean, p_activo boolean)
  returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not privado.es_admin() then
    raise exception 'Solo el administrador cambia los permisos' using errcode = '42501';
  end if;
  if p_rol is null or p_rol not in ('entrenador', 'dietista') or p_admin is null or p_activo is null then
    raise exception 'Permisos no válidos' using errcode = '22023';
  end if;
  if not exists (select 1 from public.equipo where user_id = p_user) then
    raise exception 'Esa persona no es del equipo' using errcode = '22023';
  end if;
  if p_user = auth.uid() and (not p_admin or not p_activo) then
    raise exception 'No puedes quitarte la administración ni suspenderte' using errcode = '42501';
  end if;
  update public.equipo set rol = p_rol, admin = p_admin, activo = p_activo where user_id = p_user;
  if not exists (select 1 from public.equipo where admin and activo) then
    raise exception 'Tiene que quedar al menos un administrador' using errcode = '42501';
  end if;
end $$;
revoke all on function public.cambiar_permisos(uuid, text, boolean, boolean) from public, anon;
grant execute on function public.cambiar_permisos(uuid, text, boolean, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 3 · Registro de actividad
-- ---------------------------------------------------------------------
create table privado.registro (
  id          bigint generated always as identity primary key,
  fecha       timestamptz not null default now(),
  quien       uuid,                      -- la cuenta (null: el sistema o el panel de Supabase)
  rol         text not null,             -- entrenador, dietista, cliente, sistema
  accion      text not null,             -- alta, cambio, borrado, inicio_sesion, dos_pasos_activado…
  tabla       text,
  fila        text,
  cliente_id  uuid,                      -- sin clave ajena: el registro sobrevive al borrado del cliente
  campos      text[],                    -- qué campos cambiaron (los nombres, nunca el contenido)
  detalle     jsonb check (detalle is null or pg_column_size(detalle) < 2000)
);
create index registro_fecha on privado.registro (fecha desc);
create index registro_cliente on privado.registro (cliente_id, fecha desc);
create index registro_quien on privado.registro (quien, fecha desc);
alter table privado.registro enable row level security;
revoke all on privado.registro from public, anon, authenticated;
grant select, insert on privado.registro to service_role;

-- Solo crece: no se cambia nunca y solo se borra lo de más de 2 años
create or replace function privado.registro_intocable() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.fecha < now() - interval '2 years' then
    return old;
  end if;
  raise exception 'El registro de actividad no se cambia ni se borra' using errcode = '42501';
end $$;
create trigger intocable before update or delete on privado.registro
  for each row execute function privado.registro_intocable();
create or replace function privado.registro_sin_vaciar() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  raise exception 'El registro de actividad no se vacía' using errcode = '42501';
end $$;
create trigger sin_vaciar before truncate on privado.registro
  for each statement execute function privado.registro_sin_vaciar();

-- Quién es la cuenta que actúa
create or replace function privado.rol_de(p_uid uuid) returns text
  language sql stable security definer set search_path = ''
as $$
  select case
    when p_uid is null then 'sistema'
    else coalesce((select e.rol from public.equipo e where e.user_id = p_uid),
                  (select 'cliente' from public.clientes c where c.user_id = p_uid limit 1),
                  'cuenta')
  end
$$;
revoke all on function privado.rol_de(uuid) from public, anon, authenticated;

-- Apunta una acción a mano (lo usan las funciones de abajo)
create or replace function privado.apuntar_accion(p_accion text, p_cliente uuid, p_detalle jsonb default null)
  returns void
  language sql security definer set search_path = ''
as $$
  insert into privado.registro (quien, rol, accion, cliente_id, detalle)
  values (auth.uid(), privado.rol_de(auth.uid()), p_accion, p_cliente, p_detalle)
$$;
revoke all on function privado.apuntar_accion(text, uuid, jsonb) from public, anon, authenticated;

-- Disparador común: qué tabla, qué fila, de qué cliente, qué campos cambiaron y, solo de los campos
-- que no son de salud, el valor de antes y el de ahora.
create or replace function privado.apuntar() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_fila jsonb := coalesce(v_new, v_old);
  v_cliente uuid;
  v_campos text[];
  v_visibles text[];
  v_detalle jsonb := '{}'::jsonb;
  k text;
begin
  -- Al borrar un cliente, el sistema borra en cascada sus datos: basta con apuntar el del cliente
  if tg_op = 'DELETE' and auth.uid() is null and tg_table_name <> 'clientes' then
    return null;
  end if;
  v_cliente := case when tg_table_name = 'clientes' then (v_fila ->> 'id')::uuid
                    else nullif(v_fila ->> 'cliente_id', '')::uuid end;
  if tg_op = 'UPDATE' then
    select array_agg(j.key order by j.key) into v_campos
      from jsonb_each(v_new) j
     where j.key not in ('actualizado', 'actualizado_por')
       and j.value is distinct from v_old -> j.key;
    if v_campos is null then
      return null;                                  -- nada cambió de verdad
    end if;
    -- en salud, qué apartados del cuestionario (no su contenido)
    if tg_table_name = 'salud' and 'datos' = any (v_campos) and jsonb_typeof(v_new -> 'datos') = 'object' then
      select array_agg('datos.' || j.key order by j.key) into v_campos
        from jsonb_each(v_new -> 'datos') j
       where j.value is distinct from (case when jsonb_typeof(v_old -> 'datos') = 'object' then v_old -> 'datos' end) -> j.key;
      v_campos := coalesce(v_campos, array['datos']);
    end if;
  end if;
  v_visibles := case tg_table_name
    when 'clientes'             then array['estado', 'acceso_hasta', 'precio', 'tarifa', 'programa_semanas']
    when 'equipo'               then array['nombre', 'rol', 'admin', 'activo']
    when 'pagos'                then array['importe', 'metodo', 'anulado', 'periodo_desde', 'periodo_hasta']
    when 'facturas'             then array['serie', 'numero', 'tipo', 'total']
    when 'consentimientos'      then array['tipo', 'estado', 'version', 'detalle']
    when 'solicitudes_derechos' then array['tipo', 'estado', 'plazo']
    else array[]::text[] end;
  foreach k in array v_visibles loop
    if tg_op = 'UPDATE' then
      if k = any (v_campos) then
        v_detalle := v_detalle || jsonb_build_object(k, jsonb_build_object('antes', v_old -> k, 'ahora', v_new -> k));
      end if;
    elsif v_fila ? k then
      v_detalle := v_detalle || jsonb_build_object(k, v_fila -> k);
    end if;
  end loop;
  insert into privado.registro (quien, rol, accion, tabla, fila, cliente_id, campos, detalle)
  values (auth.uid(), privado.rol_de(auth.uid()),
          case tg_op when 'INSERT' then 'alta' when 'UPDATE' then 'cambio' else 'borrado' end,
          tg_table_name, coalesce(v_fila ->> 'id', v_fila ->> 'cliente_id', v_fila ->> 'user_id'),
          v_cliente, v_campos, nullif(v_detalle, '{}'::jsonb));
  return null;
end $$;
revoke all on function privado.apuntar() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['clientes', 'equipo', 'pagos', 'facturas', 'consentimientos', 'planes_entreno',
                           'planes_nutricion', 'salud', 'datos_fiscales', 'config_pagos', 'catalogo'] loop
    execute format('create trigger registro after insert or update or delete on public.%I
                      for each row execute function privado.apuntar()', t);
  end loop;
end $$;

-- Cuentas: inicios de sesión, segundo paso y cambios de contraseña. Si algo fallara aquí, la
-- entrada no se bloquea: el registro nunca puede impedir iniciar sesión.
create or replace function privado.apuntar_cuenta() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid;
  v_accion text;
  v_detalle jsonb;
begin
  begin
    if tg_table_name = 'sessions' then
      if tg_op = 'INSERT' then
        v_uid := new.user_id; v_accion := 'inicio_sesion';
        v_detalle := jsonb_build_object('navegador', left(coalesce(new.user_agent, ''), 200), 'ip', host(new.ip));
      elsif new.aal::text = 'aal2' and old.aal::text is distinct from 'aal2' then
        v_uid := new.user_id; v_accion := 'segundo_paso_superado';
      end if;
    elsif tg_table_name = 'mfa_factors' then
      if tg_op = 'UPDATE' and new.status::text = 'verified' and old.status::text is distinct from 'verified' then
        v_uid := new.user_id; v_accion := 'dos_pasos_activado';
      elsif tg_op = 'DELETE' and old.status::text = 'verified' then
        v_uid := old.user_id; v_accion := 'dos_pasos_desactivado';
      end if;
    elsif tg_table_name = 'users' then
      if tg_op = 'UPDATE' and new.encrypted_password is distinct from old.encrypted_password then
        v_uid := new.id; v_accion := 'cambio_contrasena';
      elsif tg_op = 'DELETE' then
        v_uid := old.id; v_accion := 'cuenta_borrada';
      end if;
    end if;
    if v_accion is not null then
      insert into privado.registro (quien, rol, accion, tabla, cliente_id, detalle)
      values (v_uid, privado.rol_de(v_uid), v_accion, 'cuenta',
              (select c.id from public.clientes c where c.user_id = v_uid limit 1), v_detalle);
    end if;
  exception when others then
    null;
  end;
  return null;
end $$;
revoke all on function privado.apuntar_cuenta() from public, anon, authenticated;

create trigger fsd_registro after insert or update of aal on auth.sessions
  for each row execute function privado.apuntar_cuenta();
create trigger fsd_registro after update of status or delete on auth.mfa_factors
  for each row execute function privado.apuntar_cuenta();
create trigger fsd_registro after update of encrypted_password or delete on auth.users
  for each row execute function privado.apuntar_cuenta();

-- Lectura, solo el administrador. Con los nombres de quién y de qué cliente.
create or replace function public.registro_actividad(
    p_desde timestamptz default null, p_hasta timestamptz default null, p_accion text default null,
    p_cliente uuid default null, p_quien uuid default null, p_limite integer default 200)
  returns table (id bigint, fecha timestamptz, quien uuid, quien_nombre text, rol text, accion text, tabla text,
                 cliente_id uuid, cliente_nombre text, campos text[], detalle jsonb)
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if not privado.es_admin() then
    raise exception 'Solo el administrador ve el registro de actividad' using errcode = '42501';
  end if;
  return query
    select r.id, r.fecha, r.quien,
           coalesce((select e.nombre from public.equipo e where e.user_id = r.quien),
                    (select c.nombre from public.clientes c where c.user_id = r.quien limit 1)),
           r.rol, r.accion, r.tabla, r.cliente_id,
           (select c.nombre from public.clientes c where c.id = r.cliente_id),
           r.campos, r.detalle
      from privado.registro r
     where (p_desde is null or r.fecha >= p_desde)
       and (p_hasta is null or r.fecha < p_hasta)
       and (p_accion is null or r.accion = p_accion or r.tabla = p_accion)
       and (p_cliente is null or r.cliente_id = p_cliente)
       and (p_quien is null or r.quien = p_quien)
     order by r.fecha desc, r.id desc
     limit greatest(1, least(coalesce(p_limite, 200), 1000));
end $$;
revoke all on function public.registro_actividad(timestamptz, timestamptz, text, uuid, uuid, integer) from public, anon;
grant execute on function public.registro_actividad(timestamptz, timestamptz, text, uuid, uuid, integer) to authenticated;

-- La app apunta las descargas de datos (lo que pasa solo en el aparato no lo ve el servidor)
create or replace function public.apuntar_descarga(p_que text) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if p_que = 'mis_datos' and (select privado.mi_cliente_limitado()) is not null then
    perform privado.apuntar_accion('descarga_mis_datos', (select privado.mi_cliente_limitado()));
  elsif p_que = 'copia_completa' and privado.es_equipo() then
    perform privado.apuntar_accion('descarga_copia_completa', null);
  else
    raise exception 'Descarga no válida' using errcode = '42501';
  end if;
end $$;
revoke all on function public.apuntar_descarga(text) from public, anon;
grant execute on function public.apuntar_descarga(text) to authenticated;

-- Se vacía solo lo de más de 2 años, cada día
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('registro-2-anios', '45 4 * * *',
      $tarea$delete from privado.registro where fecha < now() - interval '2 years'$tarea$);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4 · Consentimiento de cookies en el servidor (clientes y equipo)
-- ---------------------------------------------------------------------
alter table public.consentimientos alter column cliente_id drop not null;
alter table public.consentimientos drop constraint consentimientos_tipo_check;
alter table public.consentimientos add constraint consentimientos_tipo_check check (tipo in ('salud', 'imagen', 'cookies'));
alter table public.consentimientos add constraint consentimientos_ficha_check check (cliente_id is not null or tipo = 'cookies');

create or replace function privado.preparar_consentimiento() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  v_hdr json;
begin
  if auth.uid() is null then
    return new;                                  -- el servidor (pruebas) pone lo que quiera
  end if;
  new.user_id := auth.uid();
  new.cliente_id := (select privado.mi_cliente_limitado());
  if new.cliente_id is null and not (new.tipo = 'cookies' and privado.es_equipo()) then
    raise exception 'Solo un cliente con acceso registra sus consentimientos' using errcode = '42501';
  end if;
  new.fecha := now();
  if new.tipo = 'imagen' then
    -- imagen: solo los tres permisos, sí o no
    if new.estado = 'retirado' then
      new.detalle := null;
    elsif new.detalle is null or exists (select 1 from jsonb_each(new.detalle) e
                     where e.key not in ('progreso', 'reconocible', 'nombre') or jsonb_typeof(e.value) <> 'boolean') then
      raise exception 'Permisos de imagen no válidos' using errcode = '23514';
    end if;
  elsif new.tipo = 'cookies' then
    -- cookies: «dado» acepta las de preferencias; «retirado», solo las técnicas
    new.detalle := jsonb_build_object('preferencias', new.estado = 'dado');
  else
    new.detalle := null;
  end if;
  -- el navegador desde el que se dio (prueba de quién lo hizo), del propio servidor
  begin
    v_hdr := current_setting('request.headers', true)::json;
  exception when others then
    v_hdr := null;
  end;
  new.navegador := left(coalesce(v_hdr ->> 'user-agent', ''), 300);
  return new;
end $$;

drop policy "consentimientos: los registra el cliente" on public.consentimientos;
create policy "consentimientos: los registra el cliente o, las cookies, el equipo" on public.consentimientos for insert to authenticated
  with check (user_id = (select auth.uid())
              and (cliente_id = (select privado.mi_cliente_limitado())
                   or (cliente_id is null and tipo = 'cookies' and (select privado.es_equipo()))));

-- ---------------------------------------------------------------------
-- 5 · Derechos RGPD del cliente (arts. 15 a 21)
-- ---------------------------------------------------------------------
create table public.solicitudes_derechos (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references public.clientes (id) on delete cascade,
  user_id      uuid references auth.users (id) on delete set null,
  tipo         text not null check (tipo in ('acceso', 'rectificacion', 'supresion', 'oposicion', 'limitacion', 'portabilidad')),
  detalle      text not null default '' check (char_length(detalle) <= 1000),
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'en_curso', 'resuelta', 'denegada')),
  respuesta    text check (char_length(respuesta) <= 1000),
  creada       timestamptz not null default now(),
  plazo        date not null default (current_date + interval '1 month')::date,
  resuelta_en  timestamptz,
  resuelta_por uuid references auth.users (id) on delete set null
);
create index solicitudes_cliente on public.solicitudes_derechos (cliente_id, creada desc);

create or replace function privado.preparar_solicitud() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;                                  -- el servidor (pruebas)
  end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.cliente_id := (select privado.mi_cliente_limitado());
    if new.cliente_id is null or privado.es_equipo() then
      raise exception 'Solo un cliente con acceso pide sus derechos' using errcode = '42501';
    end if;
    if (select count(*) from public.solicitudes_derechos s
         where s.cliente_id = new.cliente_id and s.estado in ('pendiente', 'en_curso')) >= 10 then
      raise exception 'Ya tienes muchas solicitudes abiertas' using errcode = '54000';
    end if;
    new.detalle := btrim(coalesce(new.detalle, ''));
    new.estado := 'pendiente';
    new.respuesta := null;
    new.creada := now();
    new.plazo := (current_date + interval '1 month')::date;
    new.resuelta_en := null;
    new.resuelta_por := null;
  else
    if not privado.es_equipo() then
      raise exception 'Solo el equipo atiende las solicitudes' using errcode = '42501';
    end if;
    new.respuesta := nullif(btrim(coalesce(new.respuesta, '')), '');
    if new.estado in ('resuelta', 'denegada') and old.estado not in ('resuelta', 'denegada') then
      new.resuelta_en := now();
      new.resuelta_por := auth.uid();
    elsif new.estado in ('pendiente', 'en_curso') then
      new.resuelta_en := null;
      new.resuelta_por := null;
    end if;
    if new.estado = 'denegada' and new.respuesta is null then
      raise exception 'Para denegarla, explica el motivo' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function privado.preparar_solicitud() from public, anon, authenticated;
create trigger preparar before insert or update on public.solicitudes_derechos
  for each row execute function privado.preparar_solicitud();
create trigger limitar_escrituras before insert on public.solicitudes_derechos
  for each row execute function privado.limitar_escrituras();
create trigger registro after insert or update or delete on public.solicitudes_derechos
  for each row execute function privado.apuntar();

alter table public.solicitudes_derechos enable row level security;
revoke all on public.solicitudes_derechos from public, anon, authenticated;
grant select, insert (tipo, detalle), update (estado, respuesta) on public.solicitudes_derechos to authenticated;
grant all on public.solicitudes_derechos to service_role;

create policy "derechos: los ve el cliente y el equipo" on public.solicitudes_derechos for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado()));
create policy "derechos: los pide el cliente" on public.solicitudes_derechos for insert to authenticated
  with check (cliente_id = (select privado.mi_cliente_limitado()) and user_id = (select auth.uid()));
create policy "derechos: los atiende el equipo" on public.solicitudes_derechos for update to authenticated
  using ((select privado.es_equipo())) with check ((select privado.es_equipo()));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.solicitudes_derechos;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6 · Las funciones que miraban el equipo directamente respetan ahora la suspensión y el segundo
--     paso (mismas funciones de antes; solo cambia la comprobación de quién llama)
-- ---------------------------------------------------------------------
create or replace function privado.mi_serie() returns text
  language sql stable security definer set search_path = ''
as $$ select case privado.mi_rol() when 'dietista' then 'F' when 'entrenador' then 'D' end $$;

create or replace function public.emitir_factura_cliente(p_pagos uuid[], p_receptor jsonb) returns text
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_yo       uuid := auth.uid();
  v_pagos    uuid[];
  v_n        integer;
  v_clientes integer;
  v_cliente  uuid;
  v_total    numeric(10, 2);
  v_base     numeric(10, 2);
  v_lineas   jsonb;
  v_emisor   jsonb;
  v_anio     integer := extract(year from current_date)::integer;
  v_id       uuid;
  v_codigo   text;
begin
  if (select privado.mi_rol()) is distinct from 'dietista' then
    raise exception 'Solo la dietista emite facturas a clientes' using errcode = '42501';
  end if;
  v_pagos := array(select distinct x from unnest(p_pagos) x where x is not null);
  if cardinality(v_pagos) not between 1 and 50 then
    raise exception 'Indica entre 1 y 50 pagos' using errcode = '22023';
  end if;
  v_emisor := privado.ficha_fiscal(v_yo, 'Fátima');

  perform 1 from public.pagos p where p.id = any (v_pagos) for update;
  select count(*), count(distinct p.cliente_id), min(p.cliente_id::text)::uuid, sum(p.importe),
         jsonb_agg(jsonb_build_object('fecha', p.fecha, 'importe', p.importe, 'metodo', p.metodo,
                                      'desde', p.periodo_desde, 'hasta', p.periodo_hasta) order by p.fecha)
    into v_n, v_clientes, v_cliente, v_total, v_lineas
    from public.pagos p
   where p.id = any (v_pagos) and p.factura_id is null and p.anulado is null;
  if v_n <> cardinality(v_pagos) or v_clientes <> 1 then
    raise exception 'Algún pago no existe, ya está facturado, está anulado o es de otro cliente' using errcode = '22023';
  end if;
  v_base := round(v_total / 1.07, 2);

  insert into public.facturas (emisor, serie, anio, numero, tipo, cliente_id, datos, total)
  values (v_yo, 'F', v_anio, privado.siguiente_numero('F', v_anio), 'cliente', v_cliente,
          jsonb_build_object('emisor', v_emisor, 'receptor', privado.receptor_limpio(p_receptor), 'lineas', v_lineas,
                             'concepto', 'Asesoramiento de entrenamiento y nutrición',
                             'base', v_base, 'impuesto', jsonb_build_object('nombre', 'IGIC 7 %', 'tipo', 7, 'cuota', v_total - v_base)),
          v_total)
  returning id, codigo into v_id, v_codigo;

  update public.pagos set factura_id = v_id where id = any (v_pagos);
  return v_codigo;
end $$;

create or replace function public.emitir_factura_mensual(p_mes date, p_receptor jsonb) returns text
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_yo       uuid := auth.uid();
  v_mes      date := date_trunc('month', p_mes)::date;
  v_dietista uuid;
  v_n        integer;
  v_cobrado  numeric(10, 2);
  v_base     numeric(10, 2);
  v_ret      numeric(10, 2);
  v_emisor   jsonb;
  v_receptor jsonb;
  v_anio     integer := extract(year from current_date)::integer;
  v_codigo   text;
begin
  if (select privado.mi_rol()) is distinct from 'entrenador' then
    raise exception 'Solo el entrenador emite la factura mensual' using errcode = '42501';
  end if;
  if p_mes is null or v_mes >= date_trunc('month', current_date)::date then
    raise exception 'Solo se factura un mes ya cerrado' using errcode = '22023';
  end if;
  if exists (select 1 from public.facturas f where f.tipo = 'mensual' and f.emisor = v_yo and f.mes = v_mes) then
    raise exception 'Ese mes ya está facturado' using errcode = '23505';
  end if;
  -- la dietista (con sus datos de facturación puestos)
  select e.user_id into v_dietista from public.equipo e
    left join public.datos_fiscales df on df.user_id = e.user_id
   where e.rol = 'dietista' order by (df.user_id is null), df.actualizado desc limit 1;
  v_emisor := privado.ficha_fiscal(v_yo, 'Domingo');
  v_receptor := privado.ficha_fiscal(v_dietista, 'Fátima');

  select count(*), coalesce(sum(p.importe), 0) into v_n, v_cobrado
    from public.pagos p
   where p.anulado is null and p.fecha >= v_mes and p.fecha < (v_mes + interval '1 month')::date;
  if v_n = 0 then
    raise exception 'No hay pagos de clientes en ese mes' using errcode = '22023';
  end if;
  v_base := round(v_cobrado * 0.5, 2);
  v_ret := round(v_base * 0.15, 2);

  insert into public.facturas (emisor, serie, anio, numero, tipo, mes, datos, total)
  values (v_yo, 'D', v_anio, privado.siguiente_numero('D', v_anio), 'mensual', v_mes,
          jsonb_build_object('emisor', v_emisor, 'receptor', v_receptor,
                             'concepto', 'Asesoramiento en entrenamiento', 'mes', to_char(v_mes, 'YYYY-MM'),
                             'pagos_del_mes', v_n, 'cobrado', v_cobrado, 'porcentaje', 50,
                             'base', v_base, 'impuesto', jsonb_build_object('nombre', 'Exención Franquicia Fiscal', 'tipo', 0, 'cuota', 0),
                             'retencion', jsonb_build_object('nombre', 'Retención 15 %', 'tipo', 15, 'cuota', v_ret)),
          v_base - v_ret)
  returning codigo into v_codigo;
  return v_codigo;
end $$;

create or replace function public.alta_cliente(p_por uuid, p_datos jsonb, p_acceso_hasta date, p_huella text) returns uuid
  language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_semanas text := p_datos ->> 'programa_semanas';
  v_precio  text := p_datos ->> 'precio';
begin
  if not exists (select 1 from public.equipo e where e.user_id = p_por and e.activo) then
    raise exception 'Solo el equipo da de alta clientes' using errcode = '42501';
  end if;
  if p_acceso_hasta is null or p_acceso_hasta < current_date or p_acceso_hasta > current_date + 400 then
    raise exception 'Fecha de acceso pagado no válida' using errcode = '22023';
  end if;
  if v_semanas is not null and v_semanas !~ '^[0-9]{1,3}$' then
    raise exception 'Duración del programa no válida' using errcode = '22023';
  end if;
  if v_precio is not null and v_precio !~ '^[0-9]{1,5}(\.[0-9]{1,2})?$' then
    raise exception 'Precio no válido' using errcode = '22023';
  end if;
  insert into public.clientes (nombre, objetivo, email, telefono, acceso_hasta, actualizado_por,
                               programa_semanas, tarifa, precio)
  values (trim(p_datos ->> 'nombre'), nullif(trim(p_datos ->> 'objetivo'), ''),
          nullif(lower(trim(p_datos ->> 'email')), ''), nullif(regexp_replace(coalesce(p_datos ->> 'telefono', ''), '[^0-9+]', '', 'g'), ''),
          p_acceso_hasta, p_por,
          coalesce(v_semanas::integer, 12), coalesce(nullif(p_datos ->> 'tarifa', ''), 'mensual'), v_precio::numeric)
  returning id into v_id;
  insert into public.salud (cliente_id) values (v_id);
  insert into public.planes_entreno (cliente_id) values (v_id);
  insert into public.planes_nutricion (cliente_id) values (v_id);
  insert into privado.codigos_acceso (cliente_id, huella, caduca) values (v_id, p_huella, now() + interval '3 days');
  return v_id;
end $$;

create or replace function public.nuevo_codigo(p_por uuid, p_cliente uuid, p_huella text) returns void
  language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.equipo e where e.user_id = p_por and e.activo) then
    raise exception 'Solo el equipo genera códigos' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clientes c where c.id = p_cliente and c.estado = 'activo' and c.user_id is null) then
    raise exception 'Este cliente no existe, está de baja o ya tiene cuenta' using errcode = '22023';
  end if;
  insert into privado.codigos_acceso (cliente_id, huella, caduca, usado)
  values (p_cliente, p_huella, now() + interval '3 days', null)
  on conflict (cliente_id) do update set huella = excluded.huella, caduca = excluded.caduca, usado = null;
end $$;


-- La función de alta pregunta con la sesión de quien llama si es equipo ahora mismo (activo y, si
-- tiene el segundo paso, habiéndolo superado)
create or replace function public.soy_equipo() returns boolean
  language sql stable security definer set search_path = ''
as $$ select privado.es_equipo() $$;
revoke all on function public.soy_equipo() from public, anon;
grant execute on function public.soy_equipo() to authenticated;

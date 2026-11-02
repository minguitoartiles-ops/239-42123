-- =====================================================================
-- Fitnessindramas · esquema inicial, permisos y políticas RLS
--
-- Reglas fijas de este proyecto:
--  * Toda tabla nace con RLS activado y sus políticas en la misma migración.
--  * Los permisos se dan a mano, solo a `authenticated` (usuarios con sesión).
--    `anon` (visitantes sin sesión) no recibe nada.
--  * Altas de clientes, códigos de acceso, facturas y borrados definitivos:
--    solo el servidor (`service_role`, desde Edge Functions).
--  * Las funciones auxiliares viven en el esquema `privado`, que la API no expone.
--  * Fechas de creación, autores y marcas de revisión las pone la base de
--    datos con triggers: no se pueden falsear desde la app.
-- =====================================================================

create schema if not exists privado;
revoke all on schema privado from public;

-- ---------------------------------------------------------------------
-- 1 · Tablas
-- ---------------------------------------------------------------------

-- Profesionales (Domingo, entrenador; Fátima, dietista). Solo el servidor añade o quita.
create table public.equipo (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nombre  text not null check (char_length(nombre) between 1 and 80),
  rol     text not null check (rol in ('entrenador', 'dietista')),
  creado  timestamptz not null default now()
);

create table public.clientes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references auth.users (id) on delete set null,  -- su cuenta, cuando canjea el código
  nombre          text not null check (char_length(nombre) between 1 and 80),
  objetivo        text check (char_length(objetivo) <= 40),
  email           text check (email is null or (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+$')),
  telefono        text check (telefono is null or telefono ~ '^\+?[0-9]{6,15}$'),
  estado          text not null default 'activo' check (estado in ('activo', 'baja')),
  baja            jsonb,                                  -- la rellena un trigger: fecha, motivo y quién
  fecha_alta      timestamptz not null default now(),
  actualizado     timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null
);

-- Datos de salud aparte, con su propia política (categoría especial del RGPD)
create table public.salud (
  cliente_id      uuid primary key references public.clientes (id) on delete cascade,
  datos           jsonb not null default '{}'::jsonb
                  check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) <= 65536),
  actualizado     timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null
);

-- Pauta del profesional: separada de lo que apunta el cliente
create table public.planes_entreno (
  cliente_id      uuid primary key references public.clientes (id) on delete cascade,
  pauta           jsonb not null default '{"sesiones": []}'::jsonb
                  check (jsonb_typeof(pauta) = 'object' and pg_column_size(pauta) <= 524288),
  actualizado     timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null
);

create table public.planes_nutricion (
  cliente_id      uuid primary key references public.clientes (id) on delete cascade,
  pauta           jsonb not null default '{"comidas": []}'::jsonb
                  check (jsonb_typeof(pauta) = 'object' and pg_column_size(pauta) <= 524288),
  actualizado     timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null
);

-- Lo que apunta el cliente cada semana (pesos, repeticiones, RIR, hecho)
create table public.registro_entreno (
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  semana      text not null check (semana ~ '^[0-9]{4}-W[0-9]{2}$'),   -- semana ISO: 2026-W45
  datos       jsonb not null default '{}'::jsonb
              check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) <= 262144),
  actualizado timestamptz not null default now(),
  primary key (cliente_id, semana)
);

create table public.seguimientos (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references public.clientes (id) on delete cascade,
  fecha        date not null default current_date,
  datos        jsonb not null default '{}'::jsonb
               check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) <= 131072),
  revisado     boolean not null default false,
  revisado_por uuid references auth.users (id) on delete set null,
  nota_equipo  text check (char_length(nota_equipo) <= 4000),
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now()
);
create index seguimientos_cliente_fecha on public.seguimientos (cliente_id, fecha desc);
create index seguimientos_sin_revisar on public.seguimientos (fecha desc) where not revisado;

create table public.mensajes (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references public.clientes (id) on delete cascade,
  autor        uuid default auth.uid() references auth.users (id) on delete set null,
  lado         text not null check (lado in ('in', 'out')),        -- in = equipo, out = cliente
  tipo         text not null default 'texto' check (tipo in ('texto', 'foto', 'audio')),
  texto        text check (char_length(texto) <= 4000),
  archivo_ruta text check (char_length(archivo_ruta) <= 300),     -- <cliente_id>/<archivo> en Storage
  cita_de      uuid references public.mensajes (id) on delete set null,
  eliminado    boolean not null default false,
  fecha        timestamptz not null default now(),
  check (eliminado or texto is not null or archivo_ruta is not null)   -- sin mensajes vacíos
);
create index mensajes_chat on public.mensajes (cliente_id, fecha);
create index mensajes_cita on public.mensajes (cita_de);

-- Pagos registrados a mano. No se editan ni se borran: un error se corrige con otro apunte.
create table public.pagos (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes (id) on delete cascade,
  fecha          date not null default current_date,
  importe        numeric(10, 2) not null check (importe > 0 and importe < 100000),
  metodo         text not null check (metodo in ('bizum', 'transferencia', 'efectivo', 'otro')),
  periodo_desde  date,
  periodo_hasta  date,
  nota           text check (char_length(nota) <= 500),
  registrado_por uuid default auth.uid() references auth.users (id) on delete set null,
  creado         timestamptz not null default now(),
  check (periodo_desde is null or periodo_hasta is null or periodo_hasta >= periodo_desde)
);
create index pagos_cliente on public.pagos (cliente_id, fecha desc);

-- Facturas: las emite y numera solo el servidor. Se conservan aunque el cliente se borre,
-- por eso llevan copia de los datos fiscales y las líneas en `datos`.
create table public.facturas (
  id         uuid primary key default gen_random_uuid(),
  emisor     uuid not null references public.equipo (user_id) on delete restrict,
  serie      text not null check (serie ~ '^[A-Z0-9-]{1,10}$'),
  numero     integer not null check (numero > 0),
  fecha      date not null default current_date,
  cliente_id uuid references public.clientes (id) on delete set null,
  datos      jsonb not null check (jsonb_typeof(datos) = 'object'),
  total      numeric(10, 2) not null check (total >= 0),
  creado     timestamptz not null default now(),
  unique (emisor, serie, numero)
);
create index facturas_cliente on public.facturas (cliente_id);

-- Bizum y transferencia: fuera del código público, visibles solo con sesión
create table public.config_pagos (
  id              smallint primary key default 1 check (id = 1),
  bizum           text[] not null default '{}' check (cardinality(bizum) <= 3),
  iban            text check (iban is null or iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$'),
  titular         text check (char_length(titular) <= 80),
  banco           text check (char_length(banco) <= 60),
  actualizado     timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null
);
insert into public.config_pagos (id) values (1);

-- Ejercicios, alimentos y recetas propios del equipo (el catálogo base sigue en el código)
create table public.catalogo (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('ejercicio', 'alimento', 'receta')),
  nombre      text not null check (char_length(nombre) between 1 and 120),
  datos       jsonb not null default '{}'::jsonb
              check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) <= 65536),
  creado_por  uuid default auth.uid() references auth.users (id) on delete set null,
  actualizado timestamptz not null default now()
);

-- Códigos de acceso de primera vez: solo la huella, nunca el código. Fuera de la API.
create table privado.codigos_acceso (
  cliente_id uuid primary key references public.clientes (id) on delete cascade,
  huella     text not null,
  caduca     timestamptz not null,
  usado      timestamptz
);

-- ---------------------------------------------------------------------
-- 2 · Quién es quién (se usan dentro de las políticas)
-- ---------------------------------------------------------------------

create function privado.mi_rol() returns text
  language sql stable security definer set search_path = ''
as $$ select e.rol from public.equipo e where e.user_id = auth.uid() $$;

create function privado.es_equipo() returns boolean
  language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.equipo e where e.user_id = auth.uid()) $$;

-- El cliente con sesión, solo si está activo: una baja pierde el acceso al momento
create function privado.mi_cliente() returns uuid
  language sql stable security definer set search_path = ''
as $$ select c.id from public.clientes c where c.user_id = auth.uid() and c.estado = 'activo' $$;

-- ---------------------------------------------------------------------
-- 3 · Triggers: lo que la app no puede decidir
-- ---------------------------------------------------------------------

create function privado.sellar() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  new.actualizado := now();
  return new;
end $$;

create function privado.sellar_autor() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  new.actualizado := now();
  new.actualizado_por := auth.uid();
  return new;
end $$;

-- Una fila no puede cambiar de cliente
create function privado.cliente_fijo() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if new.cliente_id is distinct from old.cliente_id then
    raise exception 'No se puede cambiar el cliente de este dato' using errcode = '42501';
  end if;
  return new;
end $$;

create function privado.registrar_baja() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if new.estado = 'baja' and old.estado is distinct from 'baja' then
    new.baja := jsonb_build_object(
      'fecha', now(),
      'motivo', left(coalesce(new.baja ->> 'motivo', ''), 500),
      'por', auth.uid());
  elsif new.estado = 'activo' then
    new.baja := null;
  else
    new.baja := old.baja;            -- una baja ya registrada no se reescribe
  end if;
  return new;
end $$;

create function privado.preparar_mensaje() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.autor := auth.uid();         -- nadie escribe a nombre de otro
  end if;
  new.fecha := now();
  new.eliminado := false;
  if new.archivo_ruta is not null and split_part(new.archivo_ruta, '/', 1) <> new.cliente_id::text then
    raise exception 'El archivo no pertenece a este chat' using errcode = '42501';
  end if;
  if new.cita_de is not null and not exists (
       select 1 from public.mensajes m where m.id = new.cita_de and m.cliente_id = new.cliente_id) then
    raise exception 'La cita no pertenece a este chat' using errcode = '23514';
  end if;
  return new;
end $$;

-- «Mensaje eliminado»: se vacía, no se edita
create function privado.vaciar_mensaje() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if not new.eliminado or new.texto is not null or new.archivo_ruta is not null then
    raise exception 'Un mensaje solo se puede vaciar, no editar' using errcode = '42501';
  end if;
  return new;
end $$;

-- El cliente escribe su seguimiento; el equipo lo revisa y comenta, sin tocar lo que escribió
create function privado.proteger_seguimiento() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is null then          -- servidor
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.revisado := false;
    new.revisado_por := null;
    new.nota_equipo := null;
    new.creado := now();
    new.actualizado := now();
    return new;
  end if;
  if privado.es_equipo() then
    if new.datos is distinct from old.datos or new.fecha is distinct from old.fecha then
      raise exception 'El equipo no cambia lo que escribió el cliente' using errcode = '42501';
    end if;
    new.revisado_por := case when new.revisado then coalesce(old.revisado_por, auth.uid()) end;
  else
    if old.revisado then
      raise exception 'Este seguimiento ya está revisado' using errcode = '42501';
    end if;
    if new.revisado is distinct from old.revisado or new.nota_equipo is distinct from old.nota_equipo then
      raise exception 'Solo el equipo revisa y comenta' using errcode = '42501';
    end if;
  end if;
  new.actualizado := now();
  return new;
end $$;

create function privado.preparar_pago() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.registrado_por := auth.uid();
  end if;
  new.creado := now();
  return new;
end $$;

create function privado.preparar_catalogo() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and auth.uid() is not null then
    new.creado_por := auth.uid();
  elsif tg_op = 'UPDATE' then
    new.creado_por := old.creado_por;
  end if;
  new.actualizado := now();
  return new;
end $$;

create trigger sellar           before update on public.clientes          for each row execute function privado.sellar_autor();
create trigger registrar_baja   before update on public.clientes          for each row execute function privado.registrar_baja();
create trigger sellar           before insert or update on public.salud            for each row execute function privado.sellar_autor();
create trigger sellar           before insert or update on public.planes_entreno   for each row execute function privado.sellar_autor();
create trigger cliente_fijo     before update on public.planes_entreno    for each row execute function privado.cliente_fijo();
create trigger sellar           before insert or update on public.planes_nutricion for each row execute function privado.sellar_autor();
create trigger cliente_fijo     before update on public.planes_nutricion  for each row execute function privado.cliente_fijo();
create trigger sellar           before insert or update on public.registro_entreno for each row execute function privado.sellar();
create trigger cliente_fijo     before update on public.registro_entreno  for each row execute function privado.cliente_fijo();
create trigger proteger         before insert or update on public.seguimientos     for each row execute function privado.proteger_seguimiento();
create trigger preparar         before insert on public.mensajes          for each row execute function privado.preparar_mensaje();
create trigger vaciar           before update on public.mensajes          for each row execute function privado.vaciar_mensaje();
create trigger preparar         before insert on public.pagos             for each row execute function privado.preparar_pago();
create trigger sellar           before update on public.config_pagos      for each row execute function privado.sellar_autor();
create trigger preparar         before insert or update on public.catalogo         for each row execute function privado.preparar_catalogo();

-- ---------------------------------------------------------------------
-- 4 · RLS en todas las tablas
-- ---------------------------------------------------------------------

alter table public.equipo           enable row level security;
alter table public.clientes         enable row level security;
alter table public.salud            enable row level security;
alter table public.planes_entreno   enable row level security;
alter table public.planes_nutricion enable row level security;
alter table public.registro_entreno enable row level security;
alter table public.seguimientos     enable row level security;
alter table public.mensajes         enable row level security;
alter table public.pagos            enable row level security;
alter table public.facturas         enable row level security;
alter table public.config_pagos     enable row level security;
alter table public.catalogo         enable row level security;
alter table privado.codigos_acceso  enable row level security;   -- sin políticas: nadie desde la app

-- ---------------------------------------------------------------------
-- 5 · Permisos: primero se quita todo, después se da lo justo
-- ---------------------------------------------------------------------

revoke all on all tables    in schema public  from anon, authenticated;
revoke all on all sequences in schema public  from anon, authenticated;
revoke all on all functions in schema public  from public, anon, authenticated;
revoke all on all tables    in schema privado from public, anon, authenticated;
revoke all on all functions in schema privado from public, anon, authenticated;

grant usage on schema privado to authenticated, service_role;
grant execute on function privado.mi_rol(), privado.es_equipo(), privado.mi_cliente() to authenticated;

-- El servidor (Edge Functions con la clave secreta) trabaja con todo
grant all on all tables in schema public to service_role;
grant all on privado.codigos_acceso to service_role;
grant execute on all functions in schema privado to service_role;

grant select                                                    on public.equipo           to authenticated;
grant select, update (nombre, objetivo, email, telefono, estado, baja)
                                                                on public.clientes         to authenticated;
grant select, update (datos)                                    on public.salud            to authenticated;
grant select, insert (cliente_id, pauta), update (cliente_id, pauta)
                                                                on public.planes_entreno   to authenticated;
grant select, insert (cliente_id, pauta), update (cliente_id, pauta)
                                                                on public.planes_nutricion to authenticated;
grant select, insert (cliente_id, semana, datos), update (cliente_id, semana, datos)
                                                                on public.registro_entreno to authenticated;
grant select, insert (id, cliente_id, fecha, datos), update (fecha, datos, revisado, nota_equipo)
                                                                on public.seguimientos     to authenticated;
grant select, insert (id, cliente_id, lado, tipo, texto, archivo_ruta, cita_de),
              update (eliminado, texto, archivo_ruta)           on public.mensajes         to authenticated;
grant select, insert (id, cliente_id, fecha, importe, metodo, periodo_desde, periodo_hasta, nota)
                                                                on public.pagos            to authenticated;
grant select                                                    on public.facturas         to authenticated;
grant select, update (bizum, iban, titular, banco)              on public.config_pagos     to authenticated;
grant select, insert (id, tipo, nombre, datos), update (tipo, nombre, datos), delete
                                                                on public.catalogo         to authenticated;

-- ---------------------------------------------------------------------
-- 6 · Políticas
-- ---------------------------------------------------------------------

-- equipo: solo el propio equipo ve quién lo forma
create policy "equipo: lo ve el equipo" on public.equipo for select to authenticated
  using ((select privado.es_equipo()));

-- clientes
create policy "clientes: el equipo ve todos" on public.clientes for select to authenticated
  using ((select privado.es_equipo()));
create policy "clientes: cada cliente ve su ficha" on public.clientes for select to authenticated
  using (user_id = (select auth.uid()) and estado = 'activo');
create policy "clientes: el equipo edita" on public.clientes for update to authenticated
  using ((select privado.es_equipo())) with check ((select privado.es_equipo()));

-- salud: el equipo lee; el cliente lee y edita la suya
create policy "salud: lee el equipo o su cliente" on public.salud for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente()));
create policy "salud: edita su cliente" on public.salud for update to authenticated
  using (cliente_id = (select privado.mi_cliente())) with check (cliente_id = (select privado.mi_cliente()));

-- planes: el equipo lee los dos; cada profesional edita el de su área; el cliente lee el suyo
create policy "entreno: lee el equipo o su cliente" on public.planes_entreno for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente()));
create policy "entreno: crea el entrenador" on public.planes_entreno for insert to authenticated
  with check ((select privado.mi_rol()) = 'entrenador');
create policy "entreno: edita el entrenador" on public.planes_entreno for update to authenticated
  using ((select privado.mi_rol()) = 'entrenador') with check ((select privado.mi_rol()) = 'entrenador');

create policy "nutricion: lee el equipo o su cliente" on public.planes_nutricion for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente()));
create policy "nutricion: crea la dietista" on public.planes_nutricion for insert to authenticated
  with check ((select privado.mi_rol()) = 'dietista');
create policy "nutricion: edita la dietista" on public.planes_nutricion for update to authenticated
  using ((select privado.mi_rol()) = 'dietista') with check ((select privado.mi_rol()) = 'dietista');

-- registro de entreno: lo escribe el cliente; el equipo lo lee
create policy "registro: lee el equipo o su cliente" on public.registro_entreno for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente()));
create policy "registro: crea su cliente" on public.registro_entreno for insert to authenticated
  with check (cliente_id = (select privado.mi_cliente()));
create policy "registro: edita su cliente" on public.registro_entreno for update to authenticated
  using (cliente_id = (select privado.mi_cliente())) with check (cliente_id = (select privado.mi_cliente()));

-- seguimientos: los crea el cliente; los revisa el equipo (el trigger reparte qué cambia cada uno)
create policy "seguimientos: lee el equipo o su cliente" on public.seguimientos for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente()));
create policy "seguimientos: crea su cliente" on public.seguimientos for insert to authenticated
  with check (cliente_id = (select privado.mi_cliente()));
create policy "seguimientos: edita el equipo o su cliente" on public.seguimientos for update to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente()))
  with check ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente()));

-- mensajes: solo en su chat, a su nombre y en su lado
create policy "mensajes: lee el equipo o su cliente" on public.mensajes for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente()));
create policy "mensajes: escribe el equipo o su cliente" on public.mensajes for insert to authenticated
  with check (
    autor = (select auth.uid())
    and lado = case when (select privado.es_equipo()) then 'in' else 'out' end
    and ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente()))
  );
create policy "mensajes: vacía el autor" on public.mensajes for update to authenticated
  using (autor = (select auth.uid())
         and ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente())))
  with check (autor = (select auth.uid()));

-- pagos: los registra el equipo; el cliente ve los suyos
create policy "pagos: lee el equipo o su cliente" on public.pagos for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente()));
create policy "pagos: registra el equipo" on public.pagos for insert to authenticated
  with check ((select privado.es_equipo()));

-- facturas: solo lectura desde la app
create policy "facturas: lee el equipo o su cliente" on public.facturas for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente()));

-- datos de pago: los ve el equipo y los clientes activos; los cambia el equipo
create policy "config_pagos: lee el equipo o un cliente activo" on public.config_pagos for select to authenticated
  using ((select privado.es_equipo()) or (select privado.mi_cliente()) is not null);
create policy "config_pagos: edita el equipo" on public.config_pagos for update to authenticated
  using ((select privado.es_equipo())) with check ((select privado.es_equipo()));

-- catálogo propio: lo usa todo el que tiene sesión activa; lo gestiona el equipo
create policy "catalogo: lee el equipo o un cliente activo" on public.catalogo for select to authenticated
  using ((select privado.es_equipo()) or (select privado.mi_cliente()) is not null);
create policy "catalogo: crea el equipo" on public.catalogo for insert to authenticated
  with check ((select privado.es_equipo()));
create policy "catalogo: edita el equipo" on public.catalogo for update to authenticated
  using ((select privado.es_equipo())) with check ((select privado.es_equipo()));
create policy "catalogo: borra el equipo" on public.catalogo for delete to authenticated
  using ((select privado.es_equipo()));

-- ---------------------------------------------------------------------
-- 7 · Tiempo real (respeta las mismas políticas)
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.clientes, public.planes_entreno, public.planes_nutricion,
      public.registro_entreno, public.seguimientos, public.mensajes;
  end if;
end $$;

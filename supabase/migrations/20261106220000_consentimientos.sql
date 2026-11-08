-- =====================================================================
-- Fitnessindramas · consentimientos guardados en el servidor (6/11/2026)
--
-- El consentimiento explícito para tratar datos de salud (art. 9.2.a RGPD) y el permiso de uso de
-- imagen hay que poder demostrarlos: quién, cuándo, qué versión de los textos y desde qué navegador.
-- Hasta ahora solo quedaban en el móvil del cliente.
--   · Registro que solo crece: cada vez que el cliente da, cambia o retira un consentimiento se
--     añade una fila. Nada se cambia ni se borra desde la app (se borra con su ficha).
--   · Lo escribe solo el propio cliente, para su ficha (lo pone el servidor).
--   · Lo ven el cliente (lo suyo) y Domingo y Fátima.
-- =====================================================================

create table public.consentimientos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  tipo        text not null check (tipo in ('salud', 'imagen')),
  estado      text not null check (estado in ('dado', 'retirado')),
  version     text not null check (version ~ '^[0-9A-Za-z._-]{1,40}$'),
  detalle     jsonb check (detalle is null or (jsonb_typeof(detalle) = 'object' and pg_column_size(detalle) < 500)),
  navegador   text check (char_length(navegador) <= 300),
  fecha       timestamptz not null default now()
);
create index consentimientos_cliente on public.consentimientos (cliente_id, tipo, fecha desc);

create function privado.preparar_consentimiento() returns trigger
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
  if new.cliente_id is null then
    raise exception 'Solo un cliente con acceso registra sus consentimientos' using errcode = '42501';
  end if;
  new.fecha := now();
  -- imagen: solo los tres permisos, sí o no
  if new.tipo = 'imagen' then
    if new.estado = 'retirado' then
      new.detalle := null;
    elsif new.detalle is null or exists (select 1 from jsonb_each(new.detalle) e
                     where e.key not in ('progreso', 'reconocible', 'nombre') or jsonb_typeof(e.value) <> 'boolean') then
      raise exception 'Permisos de imagen no válidos' using errcode = '23514';
    end if;
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
revoke all on function privado.preparar_consentimiento() from public, anon, authenticated;
create trigger preparar before insert on public.consentimientos
  for each row execute function privado.preparar_consentimiento();

alter table public.consentimientos enable row level security;
revoke all on public.consentimientos from public, anon, authenticated;
grant select, insert (tipo, estado, version, detalle) on public.consentimientos to authenticated;
grant all on public.consentimientos to service_role;

create policy "consentimientos: los suyos y el equipo" on public.consentimientos for select to authenticated
  using ((select privado.es_equipo()) or cliente_id = (select privado.mi_cliente_limitado()));
create policy "consentimientos: los registra el cliente" on public.consentimientos for insert to authenticated
  with check (cliente_id = (select privado.mi_cliente_limitado()) and user_id = (select auth.uid()));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.consentimientos;
  end if;
end $$;

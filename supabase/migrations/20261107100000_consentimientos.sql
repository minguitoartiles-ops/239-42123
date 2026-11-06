-- =====================================================================
-- Fitnessindramas · consentimientos guardados en el servidor (6/11/2026)
--
-- Hasta ahora el consentimiento de datos de salud (art. 9.2.a RGPD), el de uso de imagen y el
-- comercial (art. 21 LSSI) se quedaban solo en el móvil del cliente. Ahora cada decisión se
-- apunta en el servidor como prueba: quién, qué, cuándo, con qué versión de la política, y desde
-- qué dirección IP y navegador. Es un registro que solo crece: nada se cambia ni se borra desde
-- la app (dar y retirar son dos apuntes distintos; vale el último de cada tipo).
--   · Lo apunta solo el propio cliente, y solo de su ficha (lo pone el servidor).
--   · Lo ven el cliente (lo suyo) y Domingo y Fátima.
--   · Si se borra la ficha del cliente, se borra con ella.
-- =====================================================================

create table public.consentimientos (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo       text not null check (tipo in ('salud', 'imagen', 'comercial')),
  dado       boolean not null,
  version    text not null check (char_length(version) between 1 and 40),
  detalle    jsonb not null default '{}'::jsonb,
  ip         text,
  navegador  text,
  fecha      timestamptz not null default now()
);
create index consentimientos_cliente on public.consentimientos (cliente_id, tipo, fecha desc);

create function privado.preparar_consentimiento() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  v_cab jsonb;
begin
  if auth.uid() is null then
    return new;
  end if;
  new.user_id := auth.uid();
  new.cliente_id := (select privado.mi_cliente_limitado());
  if new.cliente_id is null then
    raise exception 'Solo el cliente apunta sus consentimientos' using errcode = '42501';
  end if;
  new.fecha := now();
  -- de la imagen solo se guarda qué autoriza; de lo demás, nada
  new.detalle := case when new.tipo = 'imagen' then jsonb_build_object(
                   'progreso', coalesce((new.detalle ->> 'progreso')::boolean, false),
                   'reconocible', coalesce((new.detalle ->> 'reconocible')::boolean, false),
                   'nombre', coalesce((new.detalle ->> 'nombre')::boolean, false))
                 else '{}'::jsonb end;
  begin
    v_cab := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_cab := null;
  end;
  new.ip := left(trim(split_part(coalesce(v_cab ->> 'x-forwarded-for', v_cab ->> 'x-real-ip', ''), ',', 1)), 64);
  new.navegador := left(v_cab ->> 'user-agent', 200);
  return new;
end $$;
revoke all on function privado.preparar_consentimiento() from public, anon, authenticated;
create trigger preparar before insert on public.consentimientos
  for each row execute function privado.preparar_consentimiento();

alter table public.consentimientos enable row level security;
revoke all on public.consentimientos from public, anon, authenticated;
grant select, insert (tipo, dado, version, detalle) on public.consentimientos to authenticated;
grant all on public.consentimientos to service_role;

create policy "consentimientos: el cliente los suyos, el equipo todos" on public.consentimientos for select to authenticated
  using (cliente_id = (select privado.mi_cliente_limitado()) or (select privado.es_equipo()));
create policy "consentimientos: los apunta el propio cliente" on public.consentimientos for insert to authenticated
  with check (cliente_id = (select privado.mi_cliente_limitado()) and user_id = (select auth.uid()));

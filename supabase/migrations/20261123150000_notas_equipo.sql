-- =====================================================================
-- «Mis notas» de los profesionales (23/11/2026, pedido por Domingo)
--   · Agenda personal en el Inicio: texto libre (competiciones, cambios de plan, recordatorios…)
--     con fecha opcional, que se marca como hecha o se borra.
--   · Personal (decisión de Domingo): cada nota la ve, cambia y borra solo quien la escribió;
--     el compañero no la ve nunca, ni los clientes. Hay que ser del equipo y estar activo
--     (con el segundo paso superado, si lo tiene).
--   · Como mucho 500 notas por persona y 500 caracteres por nota.
-- =====================================================================

create table public.notas_equipo (
  id          uuid primary key default gen_random_uuid(),
  autor       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  texto       text not null check (char_length(btrim(texto)) between 1 and 500),
  fecha       date,
  hecha       boolean not null default false,
  creada      timestamptz not null default now(),
  actualizada timestamptz not null default now()
);
create index notas_equipo_autor on public.notas_equipo (autor);

create function privado.preparar_nota() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.autor := auth.uid();
    new.creada := now();
    if (select count(*) from public.notas_equipo n where n.autor = new.autor) >= 500 then
      raise exception 'Tienes demasiadas notas. Borra alguna de las hechas.' using errcode = '54000';
    end if;
  elsif new.autor is distinct from old.autor then
    raise exception 'Una nota no cambia de dueño' using errcode = '42501';
  end if;
  new.texto := btrim(new.texto);
  new.actualizada := now();
  return new;
end $$;
revoke all on function privado.preparar_nota() from public, anon, authenticated;

create trigger preparar before insert or update on public.notas_equipo
  for each row execute function privado.preparar_nota();

alter table public.notas_equipo enable row level security;
revoke all on public.notas_equipo from public, anon, authenticated;
grant select, insert (texto, fecha), update (texto, fecha, hecha), delete on public.notas_equipo to authenticated;
grant all on public.notas_equipo to service_role;

create policy "notas: solo las ve quien las escribe" on public.notas_equipo for select to authenticated
  using (autor = (select auth.uid()) and (select privado.es_equipo()));
create policy "notas: las escribe el equipo" on public.notas_equipo for insert to authenticated
  with check (autor = (select auth.uid()) and (select privado.es_equipo()));
create policy "notas: las cambia quien las escribe" on public.notas_equipo for update to authenticated
  using (autor = (select auth.uid()) and (select privado.es_equipo()))
  with check (autor = (select auth.uid()) and (select privado.es_equipo()));
create policy "notas: las borra quien las escribe" on public.notas_equipo for delete to authenticated
  using (autor = (select auth.uid()) and (select privado.es_equipo()));

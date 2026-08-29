-- Etapa 1 / 005: citas normalizadas, privacidad y prevención de doble reserva.
-- Conserva fecha; starts_at se usa para nuevas reservas.

begin;

alter table public.optica_citas
  add column if not exists email text,
  add column if not exists starts_at timestamptz,
  add column if not exists estado text not null default 'confirmada',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'onh_appointment_status_valid') then
    alter table public.optica_citas add constraint onh_appointment_status_valid
      check (estado in ('pendiente','confirmada','atendida','cancelada','no_asistio')) not valid;
  end if;
end $$;

create unique index if not exists onh_appointments_active_slot_unique
on public.optica_citas (starts_at)
where starts_at is not null and estado in ('pendiente','confirmada');

alter table public.optica_citas enable row level security;
alter table public.optica_citas force row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'optica_citas'
  loop execute format('drop policy if exists %I on public.optica_citas', p.policyname); end loop;
end $$;
revoke all on table public.optica_citas from anon, authenticated;
grant select, update, delete on table public.optica_citas to authenticated;

drop policy if exists onh_appointments_admin_select on public.optica_citas;
create policy onh_appointments_admin_select on public.optica_citas
for select to authenticated using (public.is_optica_admin());
drop policy if exists onh_appointments_admin_update on public.optica_citas;
create policy onh_appointments_admin_update on public.optica_citas
for update to authenticated using (public.is_optica_admin()) with check (public.is_optica_admin());
drop policy if exists onh_appointments_admin_delete on public.optica_citas;
create policy onh_appointments_admin_delete on public.optica_citas
for delete to authenticated using (public.is_optica_admin());

alter table public.optica_horarios enable row level security;
alter table public.optica_horarios force row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'optica_horarios'
  loop execute format('drop policy if exists %I on public.optica_horarios', p.policyname); end loop;
end $$;
revoke all on table public.optica_horarios from anon, authenticated;
grant select on table public.optica_horarios to anon, authenticated;
grant insert, update, delete on table public.optica_horarios to authenticated;

drop policy if exists onh_schedules_public_read on public.optica_horarios;
create policy onh_schedules_public_read on public.optica_horarios
for select to anon, authenticated using (disponible is true or public.is_optica_admin());
drop policy if exists onh_schedules_admin_insert on public.optica_horarios;
create policy onh_schedules_admin_insert on public.optica_horarios
for insert to authenticated with check (public.is_optica_admin());
drop policy if exists onh_schedules_admin_update on public.optica_horarios;
create policy onh_schedules_admin_update on public.optica_horarios
for update to authenticated using (public.is_optica_admin()) with check (public.is_optica_admin());
drop policy if exists onh_schedules_admin_delete on public.optica_horarios;
create policy onh_schedules_admin_delete on public.optica_horarios
for delete to authenticated using (public.is_optica_admin());

create or replace function public.get_optica_booked_slots(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.starts_at from public.optica_citas c
  where c.starts_at >= p_from and c.starts_at < p_to
    and c.estado in ('pendiente','confirmada');
$$;

create or replace function public.create_optica_appointment(
  p_nombre text, p_rut text, p_telefono text, p_email text,
  p_tipo text, p_fecha date, p_hora time, p_fecha_legacy text
) returns text
language plpgsql security definer set search_path = ''
as $$
declare new_id text; requested_start timestamptz;
begin
  requested_start := (p_fecha + p_hora) at time zone 'America/Santiago';
  if length(trim(coalesce(p_nombre,''))) not between 3 and 200 then raise exception 'Nombre inválido'; end if;
  if length(trim(coalesce(p_rut,''))) not between 7 and 20 then raise exception 'RUT inválido'; end if;
  if length(trim(coalesce(p_telefono,''))) not between 8 and 30 then raise exception 'Teléfono inválido'; end if;
  if p_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Correo inválido'; end if;
  if requested_start <= now() or requested_start > now() + interval '4 months' then raise exception 'Horario inválido'; end if;
  if not exists (
    select 1 from public.optica_horarios h
    where h.disponible is true
      and h.fecha::date = p_fecha
      and h.hora::time = p_hora
  ) then
    raise exception 'El horario no está publicado o no está disponible';
  end if;

  insert into public.optica_citas (nombre,rut,telefono,email,tipo,fecha,starts_at,estado)
  values (trim(p_nombre),trim(p_rut),trim(p_telefono),lower(trim(p_email)),
          trim(p_tipo),p_fecha_legacy,requested_start,'confirmada')
  returning id::text into new_id;
  return new_id;
exception when unique_violation then
  raise exception using errcode = 'P0001', message = 'El horario ya fue reservado';
end $$;

revoke all on function public.get_optica_booked_slots(timestamptz,timestamptz) from public;
revoke all on function public.create_optica_appointment(text,text,text,text,text,date,time,text) from public;
grant execute on function public.get_optica_booked_slots(timestamptz,timestamptz) to anon, authenticated;
grant execute on function public.create_optica_appointment(text,text,text,text,text,date,time,text) to anon, authenticated;

commit;

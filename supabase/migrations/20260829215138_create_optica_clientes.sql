-- Base de clientes asociada a los datos entregados durante el checkout.
-- El checkout escribe mediante una RPC acotada; nunca consulta la tabla directamente.

begin;

create table if not exists public.optica_clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rut text,
  email text not null unique,
  telefono text not null,
  direccion text,
  comuna text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.optica_clientes enable row level security;
revoke all on table public.optica_clientes from public, anon, authenticated;
grant select, insert, update, delete on table public.optica_clientes to authenticated;

drop policy if exists onh_clients_admin_select on public.optica_clientes;
create policy onh_clients_admin_select on public.optica_clientes
for select to authenticated using (public.is_optica_admin());

drop policy if exists onh_clients_admin_insert on public.optica_clientes;
create policy onh_clients_admin_insert on public.optica_clientes
for insert to authenticated with check (public.is_optica_admin());

drop policy if exists onh_clients_admin_update on public.optica_clientes;
create policy onh_clients_admin_update on public.optica_clientes
for update to authenticated using (public.is_optica_admin())
with check (public.is_optica_admin());

drop policy if exists onh_clients_admin_delete on public.optica_clientes;
create policy onh_clients_admin_delete on public.optica_clientes
for delete to authenticated using (public.is_optica_admin());

create or replace function public.upsert_optica_cliente(
  p_nombre text,
  p_rut text,
  p_email text,
  p_telefono text,
  p_direccion text default null,
  p_comuna text default null,
  p_region text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  client_id uuid;
  normalized_email text := lower(trim(coalesce(p_email, '')));
begin
  if length(trim(coalesce(p_nombre, ''))) not between 2 and 160 then
    raise exception 'Nombre de cliente inválido';
  end if;
  if normalized_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'Correo de cliente inválido';
  end if;
  if length(trim(coalesce(p_telefono, ''))) not between 8 and 30 then
    raise exception 'Teléfono de cliente inválido';
  end if;

  insert into public.optica_clientes
    (nombre, rut, email, telefono, direccion, comuna, region)
  values
    (trim(p_nombre), nullif(trim(p_rut), ''), normalized_email, trim(p_telefono),
     nullif(trim(p_direccion), ''), nullif(trim(p_comuna), ''), nullif(trim(p_region), ''))
  on conflict (email) do update set
    nombre = excluded.nombre,
    rut = excluded.rut,
    telefono = excluded.telefono,
    direccion = coalesce(excluded.direccion, public.optica_clientes.direccion),
    comuna = coalesce(excluded.comuna, public.optica_clientes.comuna),
    region = coalesce(excluded.region, public.optica_clientes.region),
    updated_at = now()
  returning id into client_id;

  return client_id;
end $$;

revoke all on function public.upsert_optica_cliente(text,text,text,text,text,text,text) from public;
grant execute on function public.upsert_optica_cliente(text,text,text,text,text,text,text) to anon, authenticated;

commit;

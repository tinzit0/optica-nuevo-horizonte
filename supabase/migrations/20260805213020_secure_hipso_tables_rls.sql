
-- Función helper: ¿el usuario autenticado actual es el admin de Hipso?
create or replace function public.hipso_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'hipso.tattoo@gmail.com';
$$;

-- ============ hipso_settings ============
alter table public.hipso_settings enable row level security;

create policy "hipso_settings_public_read"
on public.hipso_settings for select
to anon, authenticated
using (true);

create policy "hipso_settings_admin_write"
on public.hipso_settings for insert
to authenticated
with check (public.hipso_is_admin());

create policy "hipso_settings_admin_update"
on public.hipso_settings for update
to authenticated
using (public.hipso_is_admin())
with check (public.hipso_is_admin());

create policy "hipso_settings_admin_delete"
on public.hipso_settings for delete
to authenticated
using (public.hipso_is_admin());

-- ============ hipso_bookings ============
alter table public.hipso_bookings enable row level security;

-- Lectura pública: se mantiene igual que el comportamiento actual del sitio
-- (necesaria para que cualquier visitante vea disponibilidad, busque su propia
-- reserva por teléfono/instagram, reagende o suba su comprobante).
create policy "hipso_bookings_public_read"
on public.hipso_bookings for select
to anon, authenticated
using (true);

-- Cualquiera puede crear una reserva nueva
create policy "hipso_bookings_public_insert"
on public.hipso_bookings for insert
to anon, authenticated
with check (true);

-- Cualquiera puede actualizar (cancelar/reagendar/subir comprobante),
-- igual que el comportamiento actual del sitio.
create policy "hipso_bookings_public_update"
on public.hipso_bookings for update
to anon, authenticated
using (true)
with check (true);

-- CAMBIO CLAVE: solo el admin puede borrar reservas confirmadas o en revisión.
-- Se permite borrar públicamente SOLO reservas todavía no pagadas
-- (para que siga funcionando la expiración automática de 15 minutos),
-- para impedir que cualquiera borre reservas confirmadas del negocio.
create policy "hipso_bookings_delete_pending_or_admin"
on public.hipso_bookings for delete
to anon, authenticated
using (
  status = 'Pendiente de Comprobante' or public.hipso_is_admin()
);
;

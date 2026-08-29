
create or replace function public.yorka_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'yorka_tatuajes@gmail.com';
$$;

-- ============ yorka_settings ============
alter table public.yorka_settings enable row level security;

create policy "yorka_settings_public_read"
on public.yorka_settings for select
to anon, authenticated
using (true);

create policy "yorka_settings_admin_write"
on public.yorka_settings for insert
to authenticated
with check (public.yorka_is_admin());

create policy "yorka_settings_admin_update"
on public.yorka_settings for update
to authenticated
using (public.yorka_is_admin())
with check (public.yorka_is_admin());

create policy "yorka_settings_admin_delete"
on public.yorka_settings for delete
to authenticated
using (public.yorka_is_admin());

-- ============ yorka_bookings ============
alter table public.yorka_bookings enable row level security;

create policy "yorka_bookings_public_read"
on public.yorka_bookings for select
to anon, authenticated
using (true);

create policy "yorka_bookings_public_insert"
on public.yorka_bookings for insert
to anon, authenticated
with check (true);

create policy "yorka_bookings_public_update"
on public.yorka_bookings for update
to anon, authenticated
using (true)
with check (true);

create policy "yorka_bookings_delete_pending_or_admin"
on public.yorka_bookings for delete
to anon, authenticated
using (
  status = 'Pendiente de Comprobante' or public.yorka_is_admin()
);
;

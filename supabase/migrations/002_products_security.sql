-- Etapa 1 / 002: completa el contrato del catálogo y restringe administración.
-- No elimina datos ni políticas preexistentes. Revisar pg_policies según SECURITY_STAGE_1.md.

begin;

alter table public.optica_productos
  add column if not exists gender text,
  add column if not exists color text,
  add column if not exists material text,
  add column if not exists features text[] not null default '{}',
  add column if not exists description text,
  add column if not exists published boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'onh_product_price_nonnegative') then
    alter table public.optica_productos
      add constraint onh_product_price_nonnegative check (price >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'onh_product_stock_nonnegative') then
    alter table public.optica_productos
      add constraint onh_product_stock_nonnegative check (stock >= 0) not valid;
  end if;
end $$;

alter table public.optica_productos enable row level security;
alter table public.optica_productos force row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'optica_productos'
  loop execute format('drop policy if exists %I on public.optica_productos', p.policyname); end loop;
end $$;

revoke all on table public.optica_productos from anon, authenticated;
grant select on table public.optica_productos to anon, authenticated;
grant insert, update, delete on table public.optica_productos to authenticated;

drop policy if exists onh_products_public_read on public.optica_productos;
create policy onh_products_public_read
on public.optica_productos for select to anon, authenticated
using (published is true);

drop policy if exists onh_products_admin_insert on public.optica_productos;
create policy onh_products_admin_insert
on public.optica_productos for insert to authenticated
with check (public.is_optica_admin());

drop policy if exists onh_products_admin_update on public.optica_productos;
create policy onh_products_admin_update
on public.optica_productos for update to authenticated
using (public.is_optica_admin()) with check (public.is_optica_admin());

drop policy if exists onh_products_admin_delete on public.optica_productos;
create policy onh_products_admin_delete
on public.optica_productos for delete to authenticated
using (public.is_optica_admin());

commit;

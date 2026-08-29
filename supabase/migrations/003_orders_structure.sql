-- Etapa 1 / 003: pedidos completos y creación pública acotada por RPC.
-- Aditiva: conserva columnas y registros existentes.

begin;

alter table public.optica_pedidos
  add column if not exists rut text,
  add column if not exists direccion_entrega text,
  add column if not exists indicaciones_entrega text,
  add column if not exists subtotal numeric(12,2),
  add column if not exists costo_envio numeric(12,2) not null default 0,
  add column if not exists receta_path text,
  add column if not exists payment_status text not null default 'not_requested',
  add column if not exists payment_reference text,
  add column if not exists updated_at timestamptz not null default now();

-- La auditoría confirmó que items existe. Se normaliza a jsonb solo si aún no lo es.
do $$
declare current_type text;
begin
  select data_type into current_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'optica_pedidos' and column_name = 'items';
  if current_type = 'json' then
    alter table public.optica_pedidos alter column items type jsonb using items::jsonb;
  elsif current_type is distinct from 'jsonb' then
    raise exception 'optica_pedidos.items debe revisarse antes de convertir a jsonb (tipo actual: %)', current_type;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'onh_order_amounts_nonnegative') then
    alter table public.optica_pedidos add constraint onh_order_amounts_nonnegative
      check (total >= 0 and coalesce(subtotal, 0) >= 0 and costo_envio >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'onh_order_payment_status_valid') then
    alter table public.optica_pedidos add constraint onh_order_payment_status_valid
      check (payment_status in ('not_requested','pending','approved','rejected','cancelled','refunded')) not valid;
  end if;
end $$;

alter table public.optica_pedidos enable row level security;
alter table public.optica_pedidos force row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'optica_pedidos'
  loop execute format('drop policy if exists %I on public.optica_pedidos', p.policyname); end loop;
end $$;
revoke all on table public.optica_pedidos from anon, authenticated;
grant select, update, delete on table public.optica_pedidos to authenticated;

drop policy if exists onh_orders_admin_select on public.optica_pedidos;
create policy onh_orders_admin_select on public.optica_pedidos
for select to authenticated using (public.is_optica_admin());
drop policy if exists onh_orders_admin_update on public.optica_pedidos;
create policy onh_orders_admin_update on public.optica_pedidos
for update to authenticated using (public.is_optica_admin()) with check (public.is_optica_admin());
drop policy if exists onh_orders_admin_delete on public.optica_pedidos;
create policy onh_orders_admin_delete on public.optica_pedidos
for delete to authenticated using (public.is_optica_admin());

create or replace function public.create_optica_order(
  p_nombre text, p_rut text, p_telefono text, p_email text,
  p_direccion_entrega text, p_indicaciones_entrega text,
  p_metodo_envio text, p_subtotal numeric, p_costo_envio numeric,
  p_total numeric, p_items jsonb, p_receta_path text default null
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  new_id text;
  calculated_subtotal numeric := 0;
  calculated_shipping numeric;
  calculated_total numeric;
  item jsonb;
  product_id_text text;
  sku_text text;
  item_quantity integer;
  product_title text;
  product_brand text;
  product_price numeric;
  product_stock integer;
  product_published boolean;
  internal_items jsonb := '[]'::jsonb;
begin
  if length(trim(coalesce(p_nombre,''))) not between 2 and 160 then raise exception 'Nombre inválido'; end if;
  if length(trim(coalesce(p_telefono,''))) not between 8 and 30 then raise exception 'Teléfono inválido'; end if;
  if p_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Correo inválido'; end if;
  if p_metodo_envio not in ('Retiro en tienda','Despacho a domicilio') then raise exception 'Entrega inválida'; end if;
  -- Estos campos se mantienen por compatibilidad de firma, pero nunca se usan para
  -- calcular dinero. Se rechazan nulos para detectar clientes incompatibles.
  if p_items is null or p_subtotal is null or p_total is null or p_costo_envio is null then
    raise exception 'Items y montos son obligatorios';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'Items inválidos'; end if;

  calculated_shipping := case when p_metodo_envio = 'Retiro en tienda' then 0 else 4500 end;
  for item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(item) <> 'object' then raise exception 'Detalle de item inválido'; end if;
    product_id_text := nullif(trim(item->>'product_id'), '');
    sku_text := nullif(trim(item->>'sku'), '');
    item_quantity := coalesce(item->>'quantity', item->>'cantidad')::integer;
    if product_id_text is null or sku_text is null or item_quantity is null or item_quantity < 1 or item_quantity > 50 then
      raise exception 'Product ID, SKU o cantidad inválidos';
    end if;

    -- product_id es siempre el identificador real del producto base. El SKU comercial
    -- puede contener guiones y nunca se usa para resolver la fila de producto.
    select p.title, p.brand, p.price, p.stock, p.published
      into product_title, product_brand, product_price, product_stock, product_published
      from public.optica_productos p
      where p.id::text = product_id_text
      limit 1;
    if not found then raise exception 'Producto inexistente'; end if;
    if product_published is not true then raise exception 'Producto no publicado'; end if;

    update public.optica_productos p
      set stock = p.stock - item_quantity, updated_at = now()
      where p.id::text = product_id_text and p.published is true and p.stock >= item_quantity;
    if not found then raise exception 'Stock insuficiente'; end if;

    calculated_subtotal := calculated_subtotal + product_price * item_quantity;
    internal_items := internal_items || jsonb_build_array(jsonb_build_object(
      'product_id', product_id_text,
      'sku', sku_text,
      'nombre', product_title,
      'marca', product_brand,
      'precio_unitario', product_price,
      'quantity', item_quantity,
      'crystal_config', coalesce(item->'crystal_config', item->'configuracion_cristales', item->'configuracion', '{}'::jsonb)
    ));
  end loop;

  calculated_total := calculated_subtotal + calculated_shipping;
  if calculated_total > 50000000 then raise exception 'Monto fuera de rango'; end if;
  if p_receta_path is not null and p_receta_path !~ '^incoming/[0-9a-f-]{36}[.](jpg|jpeg|png|pdf)$' then raise exception 'Ruta de receta inválida'; end if;
  if p_receta_path is not null and not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'prescriptions' and o.name = p_receta_path
  ) then raise exception 'La receta no existe en prescriptions'; end if;

  insert into public.optica_pedidos
    (nombre,rut,telefono,email,direccion_entrega,indicaciones_entrega,metodo_envio,
     subtotal,costo_envio,total,items,receta_path,estado,payment_status)
  values
    (trim(p_nombre),nullif(trim(p_rut),''),trim(p_telefono),lower(trim(p_email)),
     nullif(trim(p_direccion_entrega),''),nullif(trim(p_indicaciones_entrega),''),
     p_metodo_envio,calculated_subtotal,calculated_shipping,calculated_total,internal_items,p_receta_path,
     'pendiente','not_requested')
  returning id::text into new_id;
  return new_id;
end $$;

revoke all on function public.create_optica_order(text,text,text,text,text,text,text,numeric,numeric,numeric,jsonb,text) from public;
grant execute on function public.create_optica_order(text,text,text,text,text,text,text,numeric,numeric,numeric,jsonb,text) to anon, authenticated;

commit;

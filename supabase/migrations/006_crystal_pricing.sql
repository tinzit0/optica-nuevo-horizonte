-- Etapa 3.3-A / 006: precios server-side para cristales y tratamientos.
--
-- Objetivos:
--   * Mantener intacto el contrato product_id / sku / quantity / crystal_config.
--   * Leer precios únicamente desde public.optica_crystal_options.
--   * Ignorar name y price enviados dentro de crystal_config.
--   * Conservar los pedidos existentes; solo cambia el cálculo de nuevos pedidos.
--   * Mantener la firma y los permisos de create_optica_order().
--
-- Esta migración no modifica checkout.html, cart.js, checkout.js, RLS de las
-- tablas existentes ni Storage. No se ejecuta automáticamente fuera de Supabase.

begin;

create table if not exists public.optica_crystal_options (
  id text primary key,
  name text not null,
  option_type text not null,
  price numeric(12,2) not null default 0,
  active boolean not null default true,
  requires_prescription boolean not null default false,
  compatible_with jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint onh_crystal_option_price_nonnegative check (price >= 0),
  constraint onh_crystal_option_type_valid check (option_type in ('usage','lens_type','material','treatment')),
  constraint onh_crystal_option_compatibility_array check (jsonb_typeof(compatible_with) = 'array')
);

-- El catálogo de precios no se expone por PostgREST a ningún rol del frontend.
-- La RPC SECURITY DEFINER lo consulta internamente como propietaria de la tabla.
alter table public.optica_crystal_options enable row level security;
revoke all on table public.optica_crystal_options from public, anon, authenticated;

-- Precios actualmente definidos en initConfiguradorCristales() de app.js.
-- ON CONFLICT mantiene la migración idempotente y corrige metadatos/precios solo
-- para estos IDs canónicos. Los pedidos ya almacenados no se recalculan.
insert into public.optica_crystal_options
  (id, name, option_type, price, active, requires_prescription, compatible_with, sort_order)
values
  ('receta', 'Cristales con receta', 'usage', 0, true, true, '[]'::jsonb, 10),
  ('descanso', 'Cristales de descanso', 'usage', 0, true, false, '[]'::jsonb, 20),
  ('armazon', 'Solo armazón', 'usage', 0, true, false, '[]'::jsonb, 30),

  ('transparente', 'Transparente', 'lens_type', 0, true, false, '["receta","descanso"]'::jsonb, 100),
  ('azul', 'Protección luz azul-violeta', 'lens_type', 0, true, false, '["receta","descanso"]'::jsonb, 110),
  ('foto', 'Fotosensible', 'lens_type', 0, true, false, '["receta","descanso"]'::jsonb, 120),

  ('organico', 'Orgánico AR', 'material', 39990, true, false, '["transparente"]'::jsonb, 200),
  ('soft', 'Soft Air', 'material', 69990, true, false, '["transparente"]'::jsonb, 210),
  ('perfect', 'Perfect View', 'material', 149990, true, false, '["transparente"]'::jsonb, 220),
  ('plus', 'Perfect View+', 'material', 229990, true, false, '["transparente"]'::jsonb, 230),

  ('soft-azul', 'Soft Air', 'material', 109990, true, false, '["azul"]'::jsonb, 240),
  ('perfect-azul', 'Perfect View', 'material', 209990, true, false, '["azul"]'::jsonb, 250),
  ('plus-azul', 'Perfect View+', 'material', 259990, true, false, '["azul"]'::jsonb, 260),

  ('soft-foto', 'Soft Air Fotosensible', 'material', 199990, true, false, '["foto"]'::jsonb, 270),
  ('perfect-foto', 'Perfect View Fotosensible', 'material', 249990, true, false, '["foto"]'::jsonb, 280)
on conflict (id) do update set
  name = excluded.name,
  option_type = excluded.option_type,
  price = excluded.price,
  active = excluded.active,
  requires_prescription = excluded.requires_prescription,
  compatible_with = excluded.compatible_with,
  sort_order = excluded.sort_order,
  updated_at = now();

-- La auditoría no encontró tratamientos con precio en el configurador actual.
-- option_type = 'treatment' queda disponible para futuras filas canónicas.

-- Mantiene exactamente la firma pública existente. Los valores p_subtotal,
-- p_total y p_costo_envio se conservan por compatibilidad, pero nunca son la
-- autoridad del dinero. Los precios se obtienen dentro de esta transacción.
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
  item_config jsonb;
  config_entry record;
  option_record record;
  option_id text;
  product_id_text text;
  sku_text text;
  item_quantity integer;
  product_title text;
  product_brand text;
  product_price numeric;
  product_stock integer;
  product_published boolean;
  selected_ids text[] := '{}'::text[];
  selected_usage_id text;
  selected_lens_type_id text;
  selected_usage_count integer;
  selected_lens_type_count integer;
  selected_material_count integer;
  selected_treatment_count integer;
  selected_count integer;
  item_requires_prescription boolean;
  order_requires_prescription boolean := false;
  price_armazon numeric;
  price_cristales numeric;
  price_treatments numeric;
  price_unit numeric;
  normalized_config jsonb;
  internal_items jsonb := '[]'::jsonb;
  pricing_version integer := 1;
begin
  if length(trim(coalesce(p_nombre,''))) not between 2 and 160 then raise exception 'Nombre inválido'; end if;
  if length(trim(coalesce(p_telefono,''))) not between 8 and 30 then raise exception 'Teléfono inválido'; end if;
  if p_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Correo inválido'; end if;
  if p_metodo_envio not in ('Retiro en tienda','Despacho a domicilio') then raise exception 'Entrega inválida'; end if;

  -- Se mantienen por compatibilidad de firma y se rechazan nulos. Nunca se usan
  -- para validar o calcular el importe final.
  if p_items is null or p_subtotal is null or p_total is null or p_costo_envio is null then
    raise exception 'Items y montos son obligatorios';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'Items inválidos';
  end if;

  calculated_shipping := case when p_metodo_envio = 'Retiro en tienda' then 0 else 4500 end;

  for item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(item) <> 'object' then raise exception 'Detalle de item inválido'; end if;

    product_id_text := nullif(trim(item->>'product_id'), '');
    sku_text := nullif(trim(item->>'sku'), '');
    if coalesce(item->>'quantity', item->>'cantidad') is null
       or coalesce(item->>'quantity', item->>'cantidad') !~ '^[0-9]+$' then
      raise exception 'Cantidad inválida';
    end if;
    item_quantity := coalesce(item->>'quantity', item->>'cantidad')::integer;
    if product_id_text is null or sku_text is null or item_quantity < 1 or item_quantity > 50 then
      raise exception 'Product ID, SKU o cantidad inválidos';
    end if;

    -- product_id es el único identificador utilizado para resolver el armazón.
    -- El SKU puede contener cualquier cantidad de guiones y solo se conserva.
    select p.title, p.brand, p.price, p.stock, p.published
      into product_title, product_brand, product_price, product_stock, product_published
      from public.optica_productos p
      where p.id::text = product_id_text
      limit 1;
    if not found then raise exception 'Producto inexistente'; end if;
    if product_published is not true then raise exception 'Producto no publicado'; end if;
    if product_price is null or product_price < 0 then raise exception 'Precio de producto inválido'; end if;

    item_config := coalesce(
      item->'crystal_config',
      item->'configuracion_cristales',
      item->'configuracion',
      '{}'::jsonb
    );
    if jsonb_typeof(item_config) <> 'object' then raise exception 'Configuración de cristales inválida'; end if;

    selected_ids := '{}'::text[];
    selected_usage_id := null;
    selected_lens_type_id := null;
    selected_usage_count := 0;
    selected_lens_type_count := 0;
    selected_material_count := 0;
    selected_treatment_count := 0;
    selected_count := 0;
    item_requires_prescription := false;
    price_cristales := 0;
    price_treatments := 0;
    normalized_config := '{}'::jsonb;

    -- El formato actual usa claves "0", "1" y "2". Cada valor debe ser un
    -- objeto con id; name y price del cliente se ignoran completamente.
    for config_entry in
      select key, value from jsonb_each(item_config)
    loop
      if jsonb_typeof(config_entry.value) <> 'object' then
        raise exception 'Configuración de opción inválida';
      end if;

      option_id := nullif(trim(config_entry.value->>'id'), '');
      if option_id is null then raise exception 'Opción de cristal sin ID'; end if;
      if option_id = any(selected_ids) then raise exception 'Opción de cristal duplicada'; end if;

      select o.id, o.name, o.option_type, o.price, o.active,
             o.requires_prescription, o.compatible_with
        into option_record
        from public.optica_crystal_options o
        where o.id = option_id
        limit 1;
      if not found then raise exception 'Opción de cristal inexistente'; end if;
      if option_record.active is not true then raise exception 'Opción de cristal inactiva'; end if;
      if option_record.price is null or option_record.price < 0 then raise exception 'Precio de opción inválido'; end if;

      selected_ids := array_append(selected_ids, option_record.id);
      selected_count := selected_count + 1;
      if option_record.option_type = 'usage' then
        selected_usage_count := selected_usage_count + 1;
        selected_usage_id := option_record.id;
      elsif option_record.option_type = 'lens_type' then
        selected_lens_type_count := selected_lens_type_count + 1;
        selected_lens_type_id := option_record.id;
      elsif option_record.option_type = 'material' then
        selected_material_count := selected_material_count + 1;
      elsif option_record.option_type = 'treatment' then
        selected_treatment_count := selected_treatment_count + 1;
      end if;

      if option_record.requires_prescription then item_requires_prescription := true; end if;
      if option_record.option_type = 'treatment' then
        price_treatments := price_treatments + option_record.price;
      else
        price_cristales := price_cristales + option_record.price;
      end if;

      normalized_config := normalized_config || jsonb_build_object(
        config_entry.key,
        jsonb_build_object(
          'id', option_record.id,
          'name', option_record.name,
          'option_type', option_record.option_type,
          'price', option_record.price
        )
      );
    end loop;

    -- Un carrito simple puede enviar crystal_config = {}. Si hay configuración,
    -- debe representar una selección completa y no una combinación inventada.
    if selected_count > 0 then
      if selected_usage_count <> 1 then raise exception 'Uso de cristales inválido'; end if;
      if selected_usage_id = 'armazon' then
        if selected_count <> 1 then raise exception 'Solo armazón no admite cristales'; end if;
      else
        if selected_lens_type_count <> 1 or selected_material_count <> 1 then
          raise exception 'Configuración de cristales incompleta';
        end if;
      end if;
    end if;

    -- Cada opción con compatible_with no vacío debe encontrar al menos un ID
    -- compatible en la selección del mismo item.
    for option_record in
      select o.id, o.compatible_with
      from public.optica_crystal_options o
      where o.id = any(selected_ids)
    loop
      if jsonb_typeof(option_record.compatible_with) <> 'array' then
        raise exception 'Compatibilidad de opción inválida';
      end if;
      if jsonb_array_length(option_record.compatible_with) > 0
         and not exists (
           select 1
           from jsonb_array_elements_text(option_record.compatible_with) allowed(value)
           where allowed.value = any(selected_ids)
         ) then
        raise exception 'Combinación de cristales no compatible';
      end if;
    end loop;

    if item_requires_prescription then order_requires_prescription := true; end if;

    price_armazon := product_price;
    price_unit := price_armazon + price_cristales + price_treatments;
    if price_unit < 0 then raise exception 'Precio unitario inválido'; end if;
    calculated_subtotal := calculated_subtotal + price_unit * item_quantity;

    internal_items := internal_items || jsonb_build_array(jsonb_build_object(
      'product_id', product_id_text,
      'sku', sku_text,
      'nombre', product_title,
      'marca', product_brand,
      'precio_armazon', price_armazon,
      'precio_cristales', price_cristales,
      'precio_tratamientos', price_treatments,
      'precio_unitario', price_unit,
      'pricing_version', pricing_version,
      'quantity', item_quantity,
      'crystal_config', normalized_config
    ));

    -- El stock se descuenta solo después de validar producto y configuración.
    update public.optica_productos p
      set stock = p.stock - item_quantity, updated_at = now()
      where p.id::text = product_id_text
        and p.published is true
        and p.stock >= item_quantity;
    if not found then raise exception 'Stock insuficiente'; end if;
  end loop;

  if order_requires_prescription and p_receta_path is null then
    raise exception 'La receta es obligatoria para esta configuración';
  end if;
  if p_receta_path is not null and p_receta_path !~ '^incoming/[0-9a-f-]{36}[.](jpg|jpeg|png|pdf)$' then
    raise exception 'Ruta de receta inválida';
  end if;
  if p_receta_path is not null and not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'prescriptions' and o.name = p_receta_path
  ) then
    raise exception 'La receta no existe en prescriptions';
  end if;

  calculated_total := calculated_subtotal + calculated_shipping;
  if calculated_total > 50000000 then raise exception 'Monto fuera de rango'; end if;

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

-- Rollback manual (no ejecutar automáticamente): restaurar la definición de
-- create_optica_order() desde 003_orders_structure.sql. La tabla de opciones y
-- sus filas pueden conservarse sin afectar pedidos históricos; eliminarla solo
-- después de verificar que ninguna versión posterior dependa de ella.

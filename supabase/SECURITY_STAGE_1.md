# Etapa 1 — Seguridad de Supabase

Estas migraciones se prepararon sin acceso administrativo al proyecto y **no se han aplicado a producción**.

## Preflight obligatorio (Supabase SQL Editor)

Ejecutar y guardar el resultado completo antes de aplicar migraciones:

```sql
select now() as audited_at, current_user, current_database();

select schemaname, tablename, rowsecurity, forcerowsecurity
from pg_tables
where schemaname in ('public', 'storage')
  and tablename in (
    'optica_productos', 'optica_pedidos', 'optica_citas',
    'optica_horarios', 'objects', 'buckets'
  )
order by schemaname, tablename;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in (
  'optica_productos', 'optica_pedidos', 'optica_citas', 'optica_horarios'
)) or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
  and grantee in ('anon', 'authenticated')
order by table_schema, table_name, grantee, privilege_type;

select table_schema, table_name, column_name, data_type, udt_name,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'optica_productos', 'optica_pedidos', 'optica_citas', 'optica_horarios'
  )
order by table_name, ordinal_position;

select id, name, public, file_size_limit, allowed_mime_types, created_at
from storage.buckets
where id in ('optica_media', 'product-images', 'prescriptions')
order by id;

select conrelid::regclass as table_name, conname,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in (
  'public.optica_productos'::regclass,
  'public.optica_pedidos'::regclass,
  'public.optica_citas'::regclass,
  'public.optica_horarios'::regclass
)
order by conrelid::regclass::text, conname;
```

También crear un backup lógico antes de producción:

```powershell
supabase db dump --project-ref kxldsjodgfonrrlwjbws --schema public,storage --file pre-stage-1-schema.sql
supabase db dump --project-ref kxldsjodgfonrrlwjbws --data-only --schema public --file pre-stage-1-data.sql
```

## Orden de aplicación

1. Restaurar los dumps en un proyecto Supabase de staging.
2. Aplicar `001` a `005`, en orden, sobre staging.
3. Insertar manualmente el primer administrador con el UUID verificado:

```sql
insert into public.admin_profiles (user_id)
values ('UUID_CONFIRMADO_DE_AUTH_USERS');
```

4. Ejecutar las pruebas descritas al final de este documento.
5. Revisar las políticas obtenidas en el preflight. Las migraciones crean políticas
   con prefijo `onh_`, pero deliberadamente **no eliminan políticas desconocidas**.
   Una política permisiva anterior puede seguir ampliando acceso y debe eliminarse
   solo después de identificarla y guardar su definición.
   Las migraciones respaldan las políticas en `security_audit.policy_backup`; `002`,
   `003` y `005` reemplazan las políticas de sus tablas objetivo. `004` retira las
   políticas públicas asociadas a `optica_media` y aborta ante una política pública
   genérica sin filtro de bucket.
6. Desplegar frontend y migraciones en una ventana coordinada. `003`, `004` y `005`
   deben existir antes de publicar el nuevo `app.js`, `agenda.html` y panel.

## Reversión

Las migraciones son aditivas: no eliminan columnas ni datos históricos. Ante un
problema, se puede volver a publicar el frontend anterior. Para retirar las nuevas
políticas se pueden eliminar únicamente las que empiezan por `onh_`; nunca ejecutar
un borrado masivo de políticas sin conservar el preflight.

Los buckets anteriores tampoco se eliminan. `optica_media` queda disponible durante
la transición y debe retirarse en una etapa posterior, una vez migrados sus objetos.

## Pruebas de seguridad obligatorias

- `anon`: puede leer productos publicados y horarios disponibles.
- `anon`: no puede listar pedidos, citas, administradores ni recetas.
- `anon`: no puede insertar directamente en tablas; solo invocar las RPC públicas.
- Usuario autenticado sin fila en `admin_profiles`: mismos límites administrativos.
- Administrador: puede gestionar las cuatro tablas e imágenes de productos.
- Receta: se puede subir, pero su URL pública no funciona y no se puede listar.
- Enlace firmado: lo crea un administrador y expira en cinco minutos.
- Dos reservas simultáneas para el mismo `starts_at`: solo una tiene éxito.
- Pedido: conserva datos, dirección, items, cantidades, SKU y configuración.

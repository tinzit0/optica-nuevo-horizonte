# Cierre de Etapa 1 — Seguridad de Supabase y datos personales

## Estado

El paquete está implementado localmente, pero no aplicado a producción. La etapa se
considera lista para validación en staging, no certificada en producción hasta revisar
el preflight de `supabase/SECURITY_STAGE_1.md`.

## Cambios preparados

- Allowlist administrativa mediante `admin_profiles` e `is_optica_admin()`.
- Snapshot de políticas existentes y reemplazo controlado de las políticas de las
  cuatro tablas objetivo, evitando que las políticas PERMISSIVE antiguas se combinen
  por `OR` con las nuevas.
- RLS y grants de mínimo privilegio para productos, pedidos, citas y horarios.
- Pedidos completos mediante una RPC pública acotada; no hay inserción directa.
- Recetas en `prescriptions`, privado, guardando solo su ruta.
- Enlaces firmados de cinco minutos desde una sesión administrativa autorizada.
- Imágenes administrativas nuevas en `product-images`, público.
- Citas mediante RPC, sin lectura pública de datos de pacientes.
- `starts_at`, email y estado, conservando el campo histórico `fecha`.
- Índice único parcial contra doble reserva.

## Compatibilidad

- No se elimina ninguna tabla, columna, bucket ni objeto existente.
- `fecha` y `receta_url` heredados se conservan; la interfaz nueva usa `starts_at` y
  `receta_path`.
- `optica_media` se conserva durante la transición.
- Las migraciones deben aplicarse antes de desplegar los archivos frontend modificados.

## Riesgos pendientes

- Las políticas RLS existentes no fueron visibles con la clave publicable. Una política
  permisiva anterior puede ampliar el acceso aunque existan las nuevas políticas.
- El catálogo JSON sigue siendo fuente de precios. La RPC comprueba coherencia matemática,
  límites y estructura, pero todavía no puede contrastar todos los SKU con Supabase.
- La carga anónima de recetas conserva el flujo actual. No permite lectura o listado, pero
  requiere Turnstile y rate limiting server-side para mitigar abuso de almacenamiento.
- Las recetas heredadas de `optica_media` aún deben inventariarse y migrarse.
- No se ha probado el tipo real de `optica_pedidos.items`; la migración convierte `json` a
  `jsonb` y se detiene de forma segura ante otro tipo.
- No se ha ejecutado backfill de `optica_citas.starts_at`; requiere revisar el formato de
  cada valor histórico de `fecha`.

## Validación previa a producción

- Ejecutar y conservar el preflight SQL.
- Restaurar un backup en staging.
- Aplicar las cinco migraciones en orden.
- Registrar un administrador verificado.
- Probar los tres roles: anon, authenticated no admin y admin.
- Probar checkout con y sin receta.
- Confirmar que una URL pública de receta falla.
- Confirmar que el enlace firmado expira.
- Ejecutar dos reservas simultáneas del mismo horario.
- Verificar rollback del frontend y restauración del dump.

## Checklist

- [ ] RLS correcto — las políticas antiguas ya quedan cubiertas por reemplazo en las
      migraciones, pero falta ejecutar y verificar en staging.
- [ ] Recetas privadas — implementación lista; pendiente de staging y migrar heredadas.
- [ ] Pedidos completos — implementación lista; pendiente de staging.
- [ ] Admin seguro — implementación lista; pendiente de asignar UUID y probar.
- [ ] Storage protegido — políticas listas; pendiente de auditar políticas anteriores.
- [ ] Citas sin duplicados — índice/RPC listos; pendiente de concurrencia en staging.
- [x] Frontend compatible — contrato coordinado preparado, sin eliminar campos heredados.

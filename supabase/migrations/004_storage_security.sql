-- Etapa 1 / 004: separa imágenes públicas y recetas privadas.
-- No elimina optica_media ni sus objetos; la migración de archivos es posterior.

begin;

-- Cierre histórico controlado:
-- - No se eliminan objetos de optica_media.
-- - Si el bucket existe, se cambia a privado en esta misma transacción.
-- - Antes de producción deben migrarse manualmente las imágenes de productos a
--   optica-imagenes y las recetas a prescriptions, actualizando sus referencias.
-- - Las URLs antiguas de optica_media dejarán de ser públicas después de este paso.
do $$
begin
  if exists (select 1 from storage.buckets where id = 'optica_media') then
    update storage.buckets set public = false where id = 'optica_media';
    raise notice 'optica_media existe: se cerró acceso público; migrar objetos antes de producción';
  else
    raise notice 'optica_media no existe; no se creó ni eliminó ningún objeto histórico';
  end if;
end $$;

do $$
declare p record; expr text;
begin
  for p in select policyname, roles, qual, with_check from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    expr := lower(coalesce(p.qual,'') || ' ' || coalesce(p.with_check,''));
    if ('public' = any(p.roles) or 'anon' = any(p.roles)) and position('optica_media' in expr) > 0 then
      execute format('drop policy if exists %I on storage.objects', p.policyname);
    elsif ('public' = any(p.roles) or 'anon' = any(p.roles)) and position('bucket_id' in expr) = 0 then
      raise exception 'Política pública genérica en storage.objects: %. Revisar preflight antes de continuar', p.policyname;
    end if;
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects'
    and ('public' = any(roles) or 'anon' = any(roles))
    and position('optica_media' in lower(coalesce(qual,'') || ' ' || coalesce(with_check,''))) > 0) then
    raise exception 'Aún existe una política pública sobre optica_media; migración detenida';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'optica-imagenes') then
    raise exception 'Falta el bucket oficial optica-imagenes; créalo/verifícalo antes de aplicar 004';
  end if;
  update storage.buckets
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif']
  where id = 'optica-imagenes';
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prescriptions','prescriptions',false,10485760,array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Imágenes: lectura pública, escritura solo administrativa.
drop policy if exists onh_optica_images_public_read on storage.objects;
create policy onh_optica_images_public_read on storage.objects
for select to anon, authenticated using (bucket_id = 'optica-imagenes');
drop policy if exists onh_optica_images_admin_insert on storage.objects;
create policy onh_optica_images_admin_insert on storage.objects
for insert to authenticated with check (bucket_id = 'optica-imagenes' and public.is_optica_admin());
drop policy if exists onh_optica_images_admin_update on storage.objects;
create policy onh_optica_images_admin_update on storage.objects
for update to authenticated using (bucket_id = 'optica-imagenes' and public.is_optica_admin())
with check (bucket_id = 'optica-imagenes' and public.is_optica_admin());
drop policy if exists onh_optica_images_admin_delete on storage.objects;
create policy onh_optica_images_admin_delete on storage.objects
for delete to authenticated using (bucket_id = 'optica-imagenes' and public.is_optica_admin());

-- Compatibilidad temporal del checkout: anon solo puede cargar, nunca listar o leer.
-- El nombre UUID, MIME y límite del bucket reducen abuso; Turnstile/rate-limit sigue pendiente.
drop policy if exists onh_prescriptions_public_insert on storage.objects;
create policy onh_prescriptions_public_insert on storage.objects
for insert to anon, authenticated with check (
  bucket_id = 'prescriptions'
  and (storage.foldername(name))[1] = 'incoming'
  and name ~ '^incoming/[0-9a-f-]{36}[.](jpg|jpeg|png|pdf)$'
  and lower(coalesce(metadata->>'mimetype','')) in ('image/jpeg','image/png','application/pdf')
  and coalesce((metadata->>'size')::bigint, 0) between 1 and 10485760
);

drop policy if exists onh_prescriptions_admin_read on storage.objects;
create policy onh_prescriptions_admin_read on storage.objects
for select to authenticated using (bucket_id = 'prescriptions' and public.is_optica_admin());
drop policy if exists onh_prescriptions_admin_delete on storage.objects;
create policy onh_prescriptions_admin_delete on storage.objects
for delete to authenticated using (bucket_id = 'prescriptions' and public.is_optica_admin());

commit;

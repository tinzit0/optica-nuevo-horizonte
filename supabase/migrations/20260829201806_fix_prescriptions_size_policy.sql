-- Storage puede omitir metadata.size y metadata.mimetype en cargas del navegador.
-- La validación pública se limita al bucket y al nombre controlado del objeto.

begin;

drop policy if exists onh_prescriptions_public_insert on storage.objects;

create policy onh_prescriptions_public_insert on storage.objects
for insert to anon, authenticated
with check (
  bucket_id = 'prescriptions'
  and (storage.foldername(name))[1] = 'incoming'
  and name ~ '^incoming/[0-9a-f-]{36}[.](jpg|jpeg|png|pdf)$'
);

commit;

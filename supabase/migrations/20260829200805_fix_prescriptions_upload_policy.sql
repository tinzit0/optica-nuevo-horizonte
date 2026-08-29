-- Permite cargas válidas cuando Storage no incluye metadata.mimetype.
-- El bucket mantiene su validación allowed_mime_types y límite de 10 MB.

begin;

drop policy if exists onh_prescriptions_public_insert on storage.objects;

create policy onh_prescriptions_public_insert on storage.objects
for insert to anon, authenticated
with check (
  bucket_id = 'prescriptions'
  and (storage.foldername(name))[1] = 'incoming'
  and name ~ '^incoming/[0-9a-f-]{36}[.](jpg|jpeg|png|pdf)$'
  and coalesce((metadata->>'size')::bigint, 0) between 1 and 10485760
);

commit;

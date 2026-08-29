-- Etapa 1 / 001: identidad administrativa explícita.
-- Aditiva y reversible: no modifica auth.users ni asigna administradores.
-- Rollback: DROP FUNCTION public.is_optica_admin(); DROP TABLE public.admin_profiles;
-- Solo hacerlo si ninguna política posterior depende de la función.

begin;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_profiles is
  'Allowlist explícita de usuarios con permisos administrativos de la óptica.';

alter table public.admin_profiles enable row level security;
alter table public.admin_profiles force row level security;

revoke all on table public.admin_profiles from anon, authenticated;

create schema if not exists security_audit;
create table if not exists security_audit.policy_backup (
  schemaname text not null, tablename text not null, policyname text not null,
  permissive text, roles text[], cmd text, qual text, with_check text,
  captured_at timestamptz not null default now(),
  primary key (schemaname, tablename, policyname)
);
revoke all on schema security_audit from public;
revoke all on table security_audit.policy_backup from public;
insert into security_audit.policy_backup
  (schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check)
select schemaname,tablename,policyname,permissive,roles::text[],cmd,qual,with_check
from pg_policies
where (schemaname = 'public' and tablename in
  ('optica_productos','optica_pedidos','optica_citas','optica_horarios'))
   or (schemaname = 'storage' and tablename = 'objects')
on conflict (schemaname,tablename,policyname) do nothing;

create or replace function public.is_optica_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.admin_profiles as ap
      where ap.user_id = auth.uid()
    );
$$;

revoke all on function public.is_optica_admin() from public;
grant execute on function public.is_optica_admin() to anon, authenticated;

commit;

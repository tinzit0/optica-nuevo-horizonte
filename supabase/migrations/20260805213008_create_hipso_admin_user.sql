
do $$
declare
  new_user_id uuid := gen_random_uuid();
begin
  if not exists (select 1 from auth.users where email = 'hipso.tattoo@gmail.com') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'hipso.tattoo@gmail.com',
      crypt('zhWMSC4Xf9Ul7I*', gen_salt('bf')),
      now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), new_user_id, new_user_id::text,
      format('{"sub":"%s","email":"%s"}', new_user_id::text, 'hipso.tattoo@gmail.com')::jsonb,
      'email', now(), now(), now()
    );
  end if;
end $$;
;

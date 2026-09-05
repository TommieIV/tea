-- Local-development account. Change this password before exposing any deployed project.
-- The values live only in the database seed, never in the frontend application.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'demo@tea.local', crypt('change-me-now', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, created_at, updated_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '{"sub":"00000000-0000-4000-8000-000000000001","email":"demo@tea.local"}',
  'email', 'demo@tea.local', now(), now()
)
on conflict (provider, provider_id) do nothing;

insert into public.profiles (id, display_name)
values ('00000000-0000-4000-8000-000000000001', 'Demo user')
on conflict (id) do nothing;

insert into public.workspaces (id, name, type)
values ('00000000-0000-4000-8000-000000000010', 'Demo Personal Workspace', 'personal')
on conflict (id) do nothing;

insert into public.roles (id, workspace_id, name)
values ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', 'Owner')
on conflict (id) do nothing;

insert into public.permissions (key, description)
values ('example.overview.view', 'View the demonstrative Example module.')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
values ('00000000-0000-4000-8000-000000000020', 'example.overview.view')
on conflict do nothing;

insert into public.memberships (user_id, workspace_id, role_id, status)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000020',
  'active'
)
on conflict (user_id, workspace_id) do nothing;

insert into public.workspace_modules (workspace_id, module_id, enabled)
values ('00000000-0000-4000-8000-000000000010', 'example', true)
on conflict (workspace_id, module_id) do update set enabled = excluded.enabled;

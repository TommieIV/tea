-- Enable the Tasks module for one existing workspace.
-- Run in the Supabase SQL Editor after applying the Tasks migration.
-- Replace target_workspace_id before executing this entire file.

begin;

do $enable_tasks$
declare
  target_workspace_id uuid := null;
  owner_role_id uuid;
begin
  if target_workspace_id is null then
    raise exception 'Set target_workspace_id before enabling Tasks.';
  end if;

  if not exists (select 1 from public.workspaces where id = target_workspace_id) then
    raise exception 'No workspace exists with id %.', target_workspace_id;
  end if;

  if (select count(*) from public.permissions where key in (
    'tasks.items.view',
    'tasks.items.create',
    'tasks.items.complete',
    'tasks.items.archive',
    'tasks.settings.manage'
  )) <> 5 then
    raise exception 'The Tasks migrations have not been applied successfully. Run both Tasks migrations before enabling Tasks.';
  end if;

  select id into owner_role_id
  from public.roles
  where workspace_id = target_workspace_id
    and name = 'Owner';

  if owner_role_id is null then
    raise exception 'Workspace % has no Owner role.', target_workspace_id;
  end if;

  insert into public.role_permissions (role_id, permission_key)
  values
    (owner_role_id, 'tasks.items.view'),
    (owner_role_id, 'tasks.items.create'),
    (owner_role_id, 'tasks.items.complete'),
    (owner_role_id, 'tasks.items.archive'),
    (owner_role_id, 'tasks.settings.manage')
  on conflict do nothing;

  insert into public.workspace_modules (workspace_id, module_id, enabled)
  values (target_workspace_id, 'tasks', true)
  on conflict (workspace_id, module_id) do update set enabled = true;
end;
$enable_tasks$;

commit;

-- Hosted initial-user bootstrap
--
-- Run this entire file in the Supabase SQL Editor only after the platform
-- migration has been applied and the user has been created through Supabase
-- Auth. Do not use this script to create an auth.users record.
--
-- Before running, replace the three NULL values below. For example:
--   target_user_id uuid := 'the-auth-user-uuid';
--   target_display_name text := 'Initial user';
--   target_workspace_name text := 'My Personal Workspace';
-- The transaction rolls back completely if a validation check fails.

begin;

do $bootstrap$
declare
  target_user_id uuid := aae1b7bf-4883-41bc-a5cc-55d5185d70d3;
  target_display_name text := Dad;
  target_workspace_name text := GoggansFam;
  personal_membership_count integer;
  existing_workspace_id uuid;
  existing_role_workspace_id uuid;
  existing_role_name text;
  existing_membership_status public.membership_status;
  bootstrap_workspace_id uuid;
  bootstrap_owner_role_id uuid;
begin
  if target_user_id is null then
    raise exception 'Set target_user_id to the UUID of a user already created in Supabase Auth.';
  end if;

  if nullif(btrim(target_display_name), '') is null then
    raise exception 'Set target_display_name before running this bootstrap.';
  end if;

  if nullif(btrim(target_workspace_name), '') is null then
    raise exception 'Set target_workspace_name before running this bootstrap.';
  end if;

  if char_length(target_workspace_name) > 120 then
    raise exception 'target_workspace_name must be 120 characters or fewer.';
  end if;

  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'No Supabase Auth user exists with id %.', target_user_id;
  end if;

  -- A rerun may reuse exactly one active Owner membership in a Personal
  -- workspace. Any other Personal membership could represent a deliberate
  -- access decision, so stop rather than changing it.
  select count(*)
  into personal_membership_count
  from public.memberships membership
  join public.workspaces workspace on workspace.id = membership.workspace_id
  where membership.user_id = target_user_id
    and workspace.type = 'personal';

  if personal_membership_count > 1 then
    raise exception 'User % already has multiple Personal workspace memberships; bootstrap was not applied.', target_user_id;
  end if;

  if personal_membership_count = 1 then
    select membership.workspace_id, role.workspace_id, role.name, membership.status
    into existing_workspace_id, existing_role_workspace_id, existing_role_name, existing_membership_status
    from public.memberships membership
    join public.workspaces workspace on workspace.id = membership.workspace_id
    join public.roles role on role.id = membership.role_id
    where membership.user_id = target_user_id
      and workspace.type = 'personal';

    if existing_role_workspace_id is distinct from existing_workspace_id
      or existing_role_name is distinct from 'Owner'
      or existing_membership_status is distinct from 'active' then
      raise exception 'User % already has a conflicting Personal workspace membership; bootstrap was not applied.', target_user_id;
    end if;

    bootstrap_workspace_id := existing_workspace_id;
  else
    insert into public.workspaces (name, type)
    values (btrim(target_workspace_name), 'personal')
    returning id into bootstrap_workspace_id;

    insert into public.roles (workspace_id, name)
    values (bootstrap_workspace_id, 'Owner')
    returning id into bootstrap_owner_role_id;

    insert into public.memberships (user_id, workspace_id, role_id, status)
    values (target_user_id, bootstrap_workspace_id, bootstrap_owner_role_id, 'active');
  end if;

  insert into public.profiles (id, display_name)
  values (target_user_id, btrim(target_display_name))
  on conflict (id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name);

  select id
  into bootstrap_owner_role_id
  from public.roles as owner_role
  where owner_role.workspace_id = bootstrap_workspace_id
    and owner_role.name = 'Owner';

  if bootstrap_owner_role_id is null then
    raise exception 'The Owner role is missing for Personal workspace %.', bootstrap_workspace_id;
  end if;

  insert into public.permissions (key, description)
  values ('example.overview.view', 'View the demonstrative Example module.')
  on conflict (key) do update
    set description = excluded.description;

  insert into public.role_permissions (role_id, permission_key)
  values (bootstrap_owner_role_id, 'example.overview.view')
  on conflict do nothing;

  insert into public.workspace_modules (workspace_id, module_id, enabled)
  values (bootstrap_workspace_id, 'example', true)
  on conflict (workspace_id, module_id) do update
    set enabled = true;
end;
$bootstrap$;

commit;

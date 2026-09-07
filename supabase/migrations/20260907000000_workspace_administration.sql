create type public.membership_permission_effect as enum ('allow', 'deny');

create table public.membership_permission_overrides (
  membership_id uuid not null references public.memberships (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  effect public.membership_permission_effect not null,
  created_at timestamptz not null default now(),
  primary key (membership_id, permission_key)
);

create index membership_permission_overrides_membership_idx
on public.membership_permission_overrides (membership_id);

alter table public.membership_permission_overrides enable row level security;
revoke all on public.membership_permission_overrides from anon, authenticated;

create or replace function private.membership_has_permission(target_membership_id uuid, target_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not exists (
      select 1 from public.memberships membership
      where membership.id = target_membership_id and membership.status = 'active'
    ) then false
    when exists (
      select 1 from public.membership_permission_overrides override
      where override.membership_id = target_membership_id
        and override.permission_key = target_permission_key
        and override.effect = 'deny'
    ) then false
    when exists (
      select 1 from public.membership_permission_overrides override
      where override.membership_id = target_membership_id
        and override.permission_key = target_permission_key
        and override.effect = 'allow'
    ) then true
    else exists (
      select 1
      from public.memberships membership
      join public.role_permissions role_permission on role_permission.role_id = membership.role_id
      where membership.id = target_membership_id
        and role_permission.permission_key = target_permission_key
    )
  end;
$$;

create or replace function private.has_workspace_permission(target_workspace_id uuid, target_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships membership
    where membership.workspace_id = target_workspace_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and private.membership_has_permission(membership.id, target_permission_key)
  );
$$;

create or replace function public.get_my_workspace_contexts()
returns table (
  workspace_id uuid,
  workspace_name text,
  workspace_type public.workspace_type,
  role_name text,
  permission_keys text[],
  enabled_module_ids text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    workspace.id,
    workspace.name,
    workspace.type,
    role.name,
    coalesce((
      select array_agg(permission.key order by permission.key)
      from public.permissions permission
      where private.has_workspace_permission(workspace.id, permission.key)
    ), '{}'),
    coalesce(array_agg(distinct workspace_module.module_id) filter (where workspace_module.enabled), '{}')
  from public.memberships membership
  join public.workspaces workspace on workspace.id = membership.workspace_id
  join public.roles role on role.id = membership.role_id
  left join public.workspace_modules workspace_module on workspace_module.workspace_id = workspace.id
  where membership.user_id = (select auth.uid()) and membership.status = 'active'
  group by workspace.id, workspace.name, workspace.type, role.name
  order by workspace.name;
$$;

insert into public.permissions (key, description)
values
  ('core.workspaces.create', 'Create a workspace.'),
  ('core.workspaces.manage', 'Edit workspace properties.'),
  ('core.members.manage', 'Manage workspace members and their permissions.'),
  ('core.modules.manage', 'Enable or disable workspace modules.')
on conflict (key) do update set description = excluded.description;

insert into public.roles (workspace_id, name)
select workspace.id, 'Member'
from public.workspaces workspace
where not exists (
  select 1 from public.roles role where role.workspace_id = workspace.id and role.name = 'Member'
);

insert into public.role_permissions (role_id, permission_key)
select role.id, permission.key
from public.roles role
cross join public.permissions permission
where role.name = 'Owner'
on conflict do nothing;

insert into public.workspace_modules (workspace_id, module_id, enabled)
select workspace.id, 'workspace-admin', true
from public.workspaces workspace
on conflict (workspace_id, module_id) do update set enabled = true;

create function public.admin_create_workspace(new_workspace_name text, new_workspace_type public.workspace_type)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_workspace_id uuid;
  owner_role_id uuid;
begin
  if not exists (
    select 1 from public.memberships membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and private.membership_has_permission(membership.id, 'core.workspaces.create')
  ) then
    raise exception 'You do not have permission to create workspaces.' using errcode = '42501';
  end if;

  if nullif(btrim(new_workspace_name), '') is null then
    raise exception 'A workspace name is required.' using errcode = '22023';
  end if;

  insert into public.workspaces (name, type) values (btrim(new_workspace_name), new_workspace_type)
  returning id into created_workspace_id;
  insert into public.roles (workspace_id, name) values (created_workspace_id, 'Owner') returning id into owner_role_id;
  insert into public.roles (workspace_id, name) values (created_workspace_id, 'Member');
  insert into public.role_permissions (role_id, permission_key)
  select owner_role_id, permission.key from public.permissions permission;
  insert into public.memberships (user_id, workspace_id, role_id, status)
  values ((select auth.uid()), created_workspace_id, owner_role_id, 'active');
  insert into public.workspace_modules (workspace_id, module_id, enabled)
  values (created_workspace_id, 'workspace-admin', true);

  return created_workspace_id;
end;
$$;

create function public.admin_update_workspace(target_workspace_id uuid, new_workspace_name text, new_workspace_type public.workspace_type)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.has_workspace_permission(target_workspace_id, 'core.workspaces.manage') then
    raise exception 'You do not have permission to manage this workspace.' using errcode = '42501';
  end if;
  if nullif(btrim(new_workspace_name), '') is null then
    raise exception 'A workspace name is required.' using errcode = '22023';
  end if;
  update public.workspaces set name = btrim(new_workspace_name), type = new_workspace_type, updated_at = now()
  where id = target_workspace_id;
end;
$$;

create function public.admin_list_workspace_roles(target_workspace_id uuid)
returns table (role_id uuid, role_name text)
language sql
stable
security definer
set search_path = public
as $$
  select role.id, role.name from public.roles role
  where role.workspace_id = target_workspace_id
    and private.has_workspace_permission(target_workspace_id, 'core.members.manage')
  order by role.name;
$$;

create function public.admin_list_workspace_permissions(target_workspace_id uuid)
returns table (permission_key text, permission_description text)
language sql
stable
security definer
set search_path = public
as $$
  select permission.key, permission.description from public.permissions permission
  where private.has_workspace_permission(target_workspace_id, 'core.members.manage')
  order by permission.key;
$$;

create function public.admin_list_workspace_members(target_workspace_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  display_name text,
  email text,
  role_id uuid,
  role_name text,
  status public.membership_status,
  permission_overrides jsonb,
  effective_permission_keys text[]
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    membership.id,
    membership.user_id,
    coalesce(profile.display_name, auth_user.email),
    auth_user.email,
    role.id,
    role.name,
    membership.status,
    coalesce(jsonb_object_agg(override.permission_key, override.effect) filter (where override.permission_key is not null), '{}'::jsonb),
    coalesce((
      select array_agg(permission.key order by permission.key)
      from public.permissions permission
      where private.membership_has_permission(membership.id, permission.key)
    ), '{}')
  from public.memberships membership
  join public.roles role on role.id = membership.role_id
  left join public.profiles profile on profile.id = membership.user_id
  left join auth.users auth_user on auth_user.id = membership.user_id
  left join public.membership_permission_overrides override on override.membership_id = membership.id
  where membership.workspace_id = target_workspace_id
    and private.has_workspace_permission(target_workspace_id, 'core.members.manage')
  group by membership.id, membership.user_id, profile.display_name, auth_user.email, role.id, role.name, membership.status
  order by coalesce(profile.display_name, auth_user.email);
$$;

create function public.admin_update_membership(target_workspace_id uuid, target_membership_id uuid, new_role_id uuid, new_status public.membership_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  current_role_name text;
  new_role_name text;
  active_owner_count integer;
begin
  if not private.has_workspace_permission(target_workspace_id, 'core.members.manage') then
    raise exception 'You do not have permission to manage workspace members.' using errcode = '42501';
  end if;
  select membership.user_id, role.name into target_user_id, current_role_name
  from public.memberships membership join public.roles role on role.id = membership.role_id
  where membership.id = target_membership_id and membership.workspace_id = target_workspace_id;
  select role.name into new_role_name from public.roles role where role.id = new_role_id and role.workspace_id = target_workspace_id;
  if target_user_id is null or new_role_name is null then raise exception 'The selected member or role is not in this workspace.' using errcode = '22023'; end if;
  if target_user_id = (select auth.uid()) and (new_role_name <> 'Owner' or new_status <> 'active') then
    raise exception 'You cannot remove your own active Owner access.' using errcode = '22023';
  end if;
  if current_role_name = 'Owner' and new_role_name <> 'Owner' or current_role_name = 'Owner' and new_status <> 'active' then
    select count(*) into active_owner_count from public.memberships membership join public.roles role on role.id = membership.role_id
    where membership.workspace_id = target_workspace_id and membership.status = 'active' and role.name = 'Owner';
    if active_owner_count <= 1 then raise exception 'A workspace must keep at least one active Owner.' using errcode = '22023'; end if;
  end if;
  update public.memberships set role_id = new_role_id, status = new_status where id = target_membership_id;
end;
$$;

create function public.admin_set_membership_permission_override(target_workspace_id uuid, target_membership_id uuid, target_permission_key text, target_effect public.membership_permission_effect default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.has_workspace_permission(target_workspace_id, 'core.members.manage') then
    raise exception 'You do not have permission to manage workspace members.' using errcode = '42501';
  end if;
  if not private.has_workspace_permission(target_workspace_id, target_permission_key) then
    raise exception 'You cannot change a permission you do not hold.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.memberships membership where membership.id = target_membership_id and membership.workspace_id = target_workspace_id) then
    raise exception 'The selected member is not in this workspace.' using errcode = '22023';
  end if;
  if target_effect is null then
    delete from public.membership_permission_overrides where membership_id = target_membership_id and permission_key = target_permission_key;
  else
    insert into public.membership_permission_overrides (membership_id, permission_key, effect)
    values (target_membership_id, target_permission_key, target_effect)
    on conflict (membership_id, permission_key) do update set effect = excluded.effect;
  end if;
end;
$$;

create function public.admin_set_workspace_module(target_workspace_id uuid, target_module_id text, target_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.has_workspace_permission(target_workspace_id, 'core.modules.manage') then
    raise exception 'You do not have permission to manage workspace modules.' using errcode = '42501';
  end if;
  if target_module_id !~ '^[a-z0-9-]+$' then raise exception 'Invalid module ID.' using errcode = '22023'; end if;
  insert into public.workspace_modules (workspace_id, module_id, enabled) values (target_workspace_id, target_module_id, target_enabled)
  on conflict (workspace_id, module_id) do update set enabled = excluded.enabled;
end;
$$;

create function public.admin_can_manage_members(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select private.has_workspace_permission(target_workspace_id, 'core.members.manage'); $$;

revoke all on function private.membership_has_permission(uuid, text) from public;
revoke all on function private.has_workspace_permission(uuid, text) from public;
revoke all on function public.admin_create_workspace(text, public.workspace_type) from public;
revoke all on function public.admin_update_workspace(uuid, text, public.workspace_type) from public;
revoke all on function public.admin_list_workspace_roles(uuid) from public;
revoke all on function public.admin_list_workspace_permissions(uuid) from public;
revoke all on function public.admin_list_workspace_members(uuid) from public;
revoke all on function public.admin_update_membership(uuid, uuid, uuid, public.membership_status) from public;
revoke all on function public.admin_set_membership_permission_override(uuid, uuid, text, public.membership_permission_effect) from public;
revoke all on function public.admin_set_workspace_module(uuid, text, boolean) from public;
revoke all on function public.admin_can_manage_members(uuid) from public;
grant execute on function public.admin_create_workspace(text, public.workspace_type) to authenticated;
grant execute on function public.admin_update_workspace(uuid, text, public.workspace_type) to authenticated;
grant execute on function public.admin_list_workspace_roles(uuid) to authenticated;
grant execute on function public.admin_list_workspace_permissions(uuid) to authenticated;
grant execute on function public.admin_list_workspace_members(uuid) to authenticated;
grant execute on function public.admin_update_membership(uuid, uuid, uuid, public.membership_status) to authenticated;
grant execute on function public.admin_set_membership_permission_override(uuid, uuid, text, public.membership_permission_effect) to authenticated;
grant execute on function public.admin_set_workspace_module(uuid, text, boolean) to authenticated;
grant execute on function public.admin_can_manage_members(uuid) to authenticated;
